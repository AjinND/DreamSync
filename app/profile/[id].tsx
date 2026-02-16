/**
 * User Profile Screen - Public profile view
 */

import { auth } from '@/firebaseConfig';
import { ProfileDreamGrid, ProfileHeader } from '@/src/components/profile';
import { EmptyState, Header } from '@/src/components/shared';
import { BucketLoaderFull } from '@/src/components/loading';
import { Button, IconButton } from '@/src/components/ui';
import { UsersService } from '@/src/services/users';
import { useTheme } from '@/src/theme';
import { BucketItem } from '@/src/types/item';
import { UserProfile } from '@/src/types/social';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft, Edit2, UserX } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { colors, isDark } = useTheme();

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [dreams, setDreams] = useState<BucketItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const isOwnProfile = auth.currentUser?.uid === id;

    useEffect(() => {
        loadProfile();
    }, [id]);

    const loadProfile = async () => {
        if (!id) return;

        setIsLoading(true);
        let userProfile: UserProfile | null = null;

        // 1. Fetch Profile
        try {
            userProfile = await UsersService.getUserProfile(id);
            setProfile(userProfile);
        } catch (error) {
            console.error('[ProfileScreen] Failed to load profile doc:', error);
        }

        // 2. Fetch Dreams (don't block profile if this fails)
        try {
            const userDreams = await UsersService.getUserPublicDreams(id);
            setDreams(userDreams as BucketItem[]);

            // Keep visible counters aligned with actual public dreams shown on this screen.
            if (userProfile) {
                const completedCount = (userDreams as BucketItem[]).filter(d => d.phase === 'done').length;
                setProfile({
                    ...userProfile,
                    publicDreamsCount: userDreams.length,
                    completedDreamsCount: completedCount,
                });
            }
        } catch (error) {
            console.error('[ProfileScreen] Failed to load user dreams:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditProfile = () => {
        // Navigate to account/settings for profile editing
        router.push('/settings/profile');
    };

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
                <Stack.Screen options={{ headerShown: false }} />
                <StatusBar style={isDark ? 'light' : 'dark'} />
                <Header
                    title="Profile"
                    leftAction={
                        <IconButton icon={ChevronLeft} onPress={() => router.back()} variant="ghost" />
                    }
                />
                <BucketLoaderFull message="Loading profile..." />
            </SafeAreaView>
        );
    }

    if (!profile) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
                <Stack.Screen options={{ headerShown: false }} />
                <StatusBar style={isDark ? 'light' : 'dark'} />
                <Header
                    title="Profile"
                    leftAction={
                        <IconButton icon={ChevronLeft} onPress={() => router.back()} variant="ghost" />
                    }
                />
                <EmptyState
                    icon={UserX}
                    title="User Not Found"
                    description="This profile doesn't exist or has been removed."
                    action={{ label: 'Go Back', onPress: () => router.back() }}
                />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar style={isDark ? 'light' : 'dark'} />

            <Header
                title="Profile"
                leftAction={
                    <IconButton icon={ChevronLeft} onPress={() => router.back()} variant="ghost" />
                }
                rightAction={
                    isOwnProfile ? (
                        <IconButton icon={Edit2} onPress={handleEditProfile} variant="ghost" />
                    ) : undefined
                }
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <ProfileHeader profile={profile} isOwnProfile={isOwnProfile} />

                {isOwnProfile && (
                    <Button
                        title="Edit Profile"
                        onPress={handleEditProfile}
                        variant="secondary"
                        fullWidth
                    />
                )}

                <ProfileDreamGrid dreams={dreams} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        gap: 24,
        paddingBottom: 40,
    },
});
