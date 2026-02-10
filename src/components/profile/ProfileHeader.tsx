/**
 * ProfileHeader - User profile header with avatar, name, bio, and stats
 */

import { useTheme } from '@/src/theme';
import { UserProfile } from '@/src/types/social';
import { CheckCircle, Sparkles, Target } from 'lucide-react-native';
import {
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { UserAvatar } from '../social/UserAvatar';

interface ProfileHeaderProps {
    profile: UserProfile;
    isOwnProfile?: boolean;
}

export function ProfileHeader({ profile, isOwnProfile }: ProfileHeaderProps) {
    const { colors } = useTheme();

    return (
        <View style={styles.container}>
            {/* Avatar and Name */}
            <View style={styles.headerRow}>
                <UserAvatar
                    name={profile.displayName}
                    avatar={profile.avatar}
                    size="large"
                />
                <View style={styles.nameContainer}>
                    <Text style={[styles.displayName, { color: colors.textPrimary }]}>
                        {profile.displayName}
                    </Text>
                    {profile.bio && (
                        <Text style={[styles.bio, { color: colors.textSecondary }]} numberOfLines={2}>
                            {profile.bio}
                        </Text>
                    )}
                </View>
            </View>

            {/* Stats Row */}
            <View style={[styles.statsRow, { backgroundColor: colors.surface }]}>
                <View style={styles.statItem}>
                    <View style={[styles.statIcon, { backgroundColor: colors.primary + '15' }]}>
                        <Target size={16} color={colors.primary} />
                    </View>
                    <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                        {profile.publicDreamsCount}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>Public Dreams</Text>
                </View>

                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                <View style={styles.statItem}>
                    <View style={[styles.statIcon, { backgroundColor: colors.statusDone + '15' }]}>
                        <CheckCircle size={16} color={colors.statusDone} />
                    </View>
                    <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                        {profile.completedDreamsCount}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>Completed</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 20,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    nameContainer: {
        flex: 1,
    },
    displayName: {
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 4,
    },
    bio: {
        fontSize: 14,
        lineHeight: 20,
    },
    statsRow: {
        flexDirection: 'row',
        borderRadius: 16,
        padding: 16,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
        gap: 6,
    },
    statIcon: {
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 2,
    },
    statValue: {
        fontSize: 20,
        fontWeight: '700',
    },
    statLabel: {
        fontSize: 12,
    },
    divider: {
        width: 1,
        height: '80%',
        alignSelf: 'center',
    },
});
