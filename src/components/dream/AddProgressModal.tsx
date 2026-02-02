import { Input } from '@/src/components/ui';
import { useTheme } from '@/src/theme';
import * as ImagePicker from 'expo-image-picker';
import { Image as ImageIcon, X } from 'lucide-react-native';
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

interface AddProgressModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (title: string, description?: string, imageUrl?: string) => void;
}

export function AddProgressModal({ visible, onClose, onSave }: AddProgressModalProps) {
    const { colors } = useTheme();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please allow access to your photo library');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            setImageUri(result.assets[0].uri);
        }
    };

    const handleSave = async () => {
        if (!title.trim()) return;
        setLoading(true);
        try {
            await onSave(
                title.trim(),
                description.trim() || undefined,
                imageUri || undefined
            );
            setTitle('');
            setDescription('');
            setImageUri(null);
            onClose();
        } finally {
            setLoading(false);
        }
    };

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
                                Add Progress Update
                            </Text>
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <X size={24} color={colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        {/* Title */}
                        <Input
                            label="What happened?"
                            placeholder="e.g., Booked flight tickets ✈️"
                            value={title}
                            onChangeText={setTitle}
                        />

                        {/* Description */}
                        <Input
                            label="Details (optional)"
                            placeholder="Add more context..."
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            numberOfLines={3}
                            style={{ minHeight: 80, textAlignVertical: 'top' }}
                        />

                        {/* Optional Image */}
                        <Text style={[styles.label, { color: colors.textSecondary }]}>
                            Add a photo (optional)
                        </Text>
                        {imageUri ? (
                            <TouchableOpacity onPress={pickImage} style={styles.imagePreview}>
                                <Image source={{ uri: imageUri }} style={styles.previewImage} />
                                <TouchableOpacity
                                    style={styles.removeImage}
                                    onPress={() => setImageUri(null)}
                                >
                                    <X size={16} color="#FFF" />
                                </TouchableOpacity>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                style={[styles.addImageButton, { borderColor: colors.border }]}
                                onPress={pickImage}
                            >
                                <ImageIcon size={24} color={colors.textMuted} />
                                <Text style={[styles.addImageText, { color: colors.textMuted }]}>
                                    Tap to add photo
                                </Text>
                            </TouchableOpacity>
                        )}

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
                                    !title.trim() && { opacity: 0.5 }
                                ]}
                                onPress={handleSave}
                                disabled={!title.trim() || loading}
                            >
                                <Text style={styles.saveText}>
                                    {loading ? 'Saving...' : 'Save'}
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
    label: {
        fontSize: 14,
        marginBottom: 8,
    },
    addImageButton: {
        height: 100,
        borderRadius: 12,
        borderWidth: 2,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    addImageText: {
        fontSize: 14,
    },
    imagePreview: {
        height: 120,
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
    },
    previewImage: {
        width: '100%',
        height: '100%',
    },
    removeImage: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 12,
        padding: 4,
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
