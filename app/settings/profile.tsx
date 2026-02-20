import { auth } from '@/firebaseConfig';
import { UserAvatar } from '@/src/components/social/UserAvatar';
import { useToast } from '@/src/providers/ToastProvider';
import { StoragePaths, StorageService } from '@/src/services/storage';
import { UsersService } from '@/src/services/users';
import { useTheme } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '@/src/components/shared';
import { IconButton } from '@/src/components/ui';
import { ChevronLeft } from 'lucide-react-native';

export default function EditProfileScreen() {
    const { colors } = useTheme();
    const router = useRouter();
    const user = auth.currentUser;
    const { showSuccess, showError } = useToast();

    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [displayName, setDisplayName] = useState('');
    const [bio, setBio] = useState('');
    const [avatar, setAvatar] = useState<string | undefined>(undefined);
    const [newAvatarUri, setNewAvatarUri] = useState<string | null>(null);
    const [profile, setProfile] = useState<any>(null);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const profile = await UsersService.getUserProfile(user.uid);
            setProfile(profile);
            if (profile) {
                setDisplayName(profile.displayName);
                setBio(profile.bio || '');
                setAvatar(profile.avatar);
            } else {
                setDisplayName(user.displayName || '');
                setAvatar(user.photoURL || undefined);
            }
        } catch (error) {
            console.error('Failed to load profile:', error);
            Alert.alert('Error', 'Failed to load profile data');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePickImage = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (permissionResult.granted === false) {
            Alert.alert('Permission Required', 'Permission to access camera roll is required!');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            setNewAvatarUri(result.assets[0].uri);
        }
    };

    const handleRemovePhoto = () => {
        Alert.alert(
            'Remove Photo',
            'Are you sure you want to remove your profile photo?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            if (!user) return;

                            // If we have a new uri selected but not saved, just clear it
                            if (newAvatarUri) {
                                setNewAvatarUri(null);
                                return;
                            }

                            // If we have a saved avatar, delete it from backend
                            if (avatar) {
                                setIsSaving(true);
                                await UsersService.deleteProfilePhoto(user.uid);
                                setAvatar(undefined);
                                setProfile({ ...profile, avatar: undefined } as any); // Optimistic update
                                setIsSaving(false);
                            }
                        } catch (error) {
                            console.error('Failed to remove photo:', error);
                            Alert.alert('Error', 'Failed to remove photo');
                            setIsSaving(false);
                        }
                    }
                }
            ]
        );
    };

    const handleSave = async () => {
        if (!user) return;
        if (!displayName.trim()) {
            Alert.alert('Validation', 'Display Name cannot be empty');
            return;
        }

        setIsSaving(true);
        try {
            let avatarUrl = avatar;

            // Upload new avatar if selected (deterministic path overwrites old avatar)
            if (newAvatarUri) {
                const path = StoragePaths.profileAvatar(user.uid);
                avatarUrl = await StorageService.uploadOptimizedImage(
                    newAvatarUri,
                    path,
                    'avatar',
                );
            }

            // Update Firestore Profile
            await UsersService.updateUserProfile({
                displayName: displayName.trim(),
                bio: bio.trim(),
                avatar: avatarUrl || null,
            } as any);

            showSuccess('Profile saved successfully');
            router.back();
        } catch (error: any) {
            __DEV__ && console.error('Failed to save profile:', error);
            showError('Failed to save profile. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, styles.center, { backgroundColor: colors.background }]} edges={['top']}>
                <Stack.Screen options={{ headerShown: false }} />
                <ActivityIndicator size="large" color={colors.primary} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            <Header
                title="Edit Profile"
                leftAction={
                    <IconButton icon={ChevronLeft} onPress={() => router.back()} variant="ghost" accessibilityLabel="Go back" />
                }
            />

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView contentContainerStyle={styles.content}>
                {/* Avatar Section */}
                <View style={styles.avatarSection}>
                    <TouchableOpacity onPress={handlePickImage} activeOpacity={0.8}>
                        <UserAvatar
                            name={displayName || 'User'}
                            avatar={newAvatarUri || avatar}
                            size={100}
                        />
                        <View style={[styles.cameraIcon, { backgroundColor: colors.primary }]}>
                            <Ionicons name="camera" size={20} color="#FFF" />
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handlePickImage}>
                        <Text style={[styles.changePhotoText, { color: colors.primary }]}>Change Photo</Text>
                    </TouchableOpacity>
                    {(avatar || newAvatarUri) && (
                        <TouchableOpacity onPress={handleRemovePhoto}>
                            <Text style={[styles.removePhotoText, { color: colors.error }]}>Remove Photo</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Form */}
                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Display Name</Text>
                        <TextInput
                            style={[styles.input, {
                                backgroundColor: colors.surface,
                                color: colors.textPrimary,
                                borderColor: colors.border
                            }]}
                            value={displayName}
                            onChangeText={setDisplayName}
                            placeholder="Your Name"
                            placeholderTextColor={colors.textMuted}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Bio</Text>
                        <TextInput
                            style={[styles.input, styles.bioInput, {
                                backgroundColor: colors.surface,
                                color: colors.textPrimary,
                                borderColor: colors.border
                            }]}
                            value={bio}
                            onChangeText={setBio}
                            placeholder="Tell us about your dreams..."
                            placeholderTextColor={colors.textMuted}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                            maxLength={160}
                        />
                        <Text style={[styles.charCount, { color: colors.textMuted }]}>
                            {bio.length}/160
                        </Text>
                    </View>
                </View>
            </ScrollView>

            {/* Footer */}
            <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
                <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: colors.primary }, isSaving && { opacity: 0.7 }]}
                    onPress={handleSave}
                    disabled={isSaving}
                >
                    {isSaving ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.saveButtonText}>Save Changes</Text>
                    )}
                </TouchableOpacity>
            </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: 24,
    },
    avatarSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    cameraIcon: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#FFF',
    },
    changePhotoText: {
        marginTop: 12,
        fontSize: 16,
        fontWeight: '600',
    },
    removePhotoText: {
        marginTop: 12,
        fontSize: 16,
        fontWeight: '600',
    },
    form: {
        gap: 20,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        marginLeft: 4,
    },
    input: {
        height: 48,
        borderRadius: 12,
        paddingHorizontal: 16,
        borderWidth: 1,
        fontSize: 16,
    },
    bioInput: {
        height: 120,
        paddingTop: 12,
        paddingBottom: 12,
    },
    charCount: {
        alignSelf: 'flex-end',
        fontSize: 12,
        marginRight: 4,
    },
    footer: {
        padding: 16,
        borderTopWidth: 1,
    },
    saveButton: {
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
});
