import { auth } from '@/firebaseConfig';
import { Input } from '@/src/components/ui';
import { StoragePaths, StorageService } from '@/src/services/storage';
import { useTheme } from '@/src/theme';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Image as ImageIcon, X } from 'lucide-react-native';
import { useState } from 'react';
import {
    Alert,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface AddMemoryModalProps {
    visible: boolean;
    dreamId: string;
    isPublic?: boolean;
    onClose: () => void;
    onSave: (memoryId: string, imageUrl: string, caption: string) => void;
}

export function AddMemoryModal({ visible, dreamId, isPublic = false, onClose, onSave }: AddMemoryModalProps) {
    const { colors } = useTheme();
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [caption, setCaption] = useState('');
    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please allow access to your photo library');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            setImageUri(result.assets[0].uri);
        }
    };

    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please allow access to your camera');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            setImageUri(result.assets[0].uri);
        }
    };

    const handleSave = async () => {
        if (!imageUri || !caption.trim()) return;

        const userId = auth.currentUser?.uid;
        if (!userId) {
            Alert.alert('Error', 'Please log in to save memories');
            return;
        }

        setLoading(true);
        setUploadProgress(0);

        try {
            const memoryId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            // Use public path for public dreams, private path for private dreams
            const path = StoragePaths.dreamMemory(userId, dreamId, memoryId, isPublic);

            const downloadUrl = await StorageService.uploadOptimizedImage(
                imageUri,
                path,
                'memoryImage',
                setUploadProgress,
            );

            await onSave(memoryId, downloadUrl, caption.trim());
            setImageUri(null);
            setCaption('');
            setUploadProgress(0);
            onClose();
        } catch (error: any) {
            Alert.alert('Upload Failed', error.message || 'Failed to upload image. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const buttonLabel = loading
        ? `Uploading... ${uploadProgress}%`
        : 'Save Memory';

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    <View style={[styles.container, { backgroundColor: colors.background }]}>
                        {/* Header */}
                        <View style={styles.header}>
                            <Text style={[styles.title, { color: colors.textPrimary }]}>
                                Add Memory
                            </Text>
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <X size={24} color={colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        {/* Image Preview / Picker */}
                        {imageUri ? (
                            <TouchableOpacity onPress={pickImage} style={styles.imagePreview}>
                                <Image source={{ uri: imageUri }} style={styles.previewImage} />
                                <View style={styles.changeOverlay}>
                                    <Text style={styles.changeText}>Tap to change</Text>
                                </View>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.imagePickerRow}>
                                <TouchableOpacity
                                    style={[styles.pickerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                                    onPress={pickImage}
                                >
                                    <ImageIcon size={28} color={colors.primary} />
                                    <Text style={[styles.pickerText, { color: colors.textSecondary }]}>
                                        Gallery
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.pickerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                                    onPress={takePhoto}
                                >
                                    <Camera size={28} color={colors.primary} />
                                    <Text style={[styles.pickerText, { color: colors.textSecondary }]}>
                                        Camera
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Caption */}
                        <Input
                            label="Caption"
                            placeholder="What's the story behind this moment?"
                            value={caption}
                            onChangeText={setCaption}
                            multiline
                            numberOfLines={3}
                            style={{ minHeight: 80, textAlignVertical: 'top' }}
                        />

                        {/* Actions */}
                        <View style={styles.actions}>
                            <TouchableOpacity
                                style={[styles.cancelButton, { borderColor: colors.border }]}
                                onPress={onClose}
                            >
                                <Text style={[styles.cancelText, { color: colors.textSecondary }]}>
                                    Cancel
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.saveButton,
                                    { backgroundColor: colors.primary },
                                    (!imageUri || !caption.trim()) && { opacity: 0.5 }
                                ]}
                                onPress={handleSave}
                                disabled={!imageUri || !caption.trim() || loading}
                            >
                                <Text style={styles.saveText}>
                                    {buttonLabel}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    keyboardView: {
        width: '100%',
    },
    container: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        maxHeight: '90%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
    },
    closeButton: {
        padding: 4,
    },
    imagePickerRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    pickerButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 32,
        borderRadius: 16,
        borderWidth: 2,
        borderStyle: 'dashed',
        gap: 8,
    },
    pickerText: {
        fontSize: 14,
        fontWeight: '500',
    },
    imagePreview: {
        height: 200,
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 20,
    },
    previewImage: {
        width: '100%',
        height: '100%',
    },
    changeOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    changeText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
    },
    cancelText: {
        fontSize: 16,
        fontWeight: '600',
    },
    saveButton: {
        flex: 2,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    saveText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
    },
});
