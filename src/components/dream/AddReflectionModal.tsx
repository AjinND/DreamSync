import { Input } from '@/src/components/ui';
import { useTheme } from '@/src/theme';
import { ReflectionBlock } from '@/src/types/item';
import { X } from 'lucide-react-native';
import { useState } from 'react';
import {
    KeyboardAvoidingView,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface AddReflectionModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (blocks: ReflectionBlock[]) => void;
}

export function AddReflectionModal({ visible, onClose, onSave }: AddReflectionModalProps) {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const [text, setText] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [linkUrl, setLinkUrl] = useState('');
    const [linkCaption, setLinkCaption] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        const blocks: ReflectionBlock[] = [];
        if (text.trim()) blocks.push({ type: 'text', value: text.trim() });
        if (imageUrl.trim()) blocks.push({ type: 'image', value: imageUrl.trim() });
        if (linkUrl.trim()) {
            blocks.push({
                type: 'link',
                value: linkUrl.trim(),
                caption: linkCaption.trim() || undefined,
            });
        }

        if (blocks.length === 0) return;

        setLoading(true);
        try {
            await onSave(blocks);
            setText('');
            setImageUrl('');
            setLinkUrl('');
            setLinkCaption('');
            onClose();
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            presentationStyle="overFullScreen"
            statusBarTranslucent
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <KeyboardAvoidingView
                    behavior="padding"
                    style={styles.keyboardView}
                >
                    <View style={[styles.container, { backgroundColor: colors.background, paddingBottom: Math.max(24, insets.bottom + 12) }]}>
                        {/* Header — always visible */}
                        <View style={styles.header}>
                            <Text style={[styles.title, { color: colors.textPrimary }]}>
                                Add Reflection
                            </Text>
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <X size={24} color={colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        {/* Scrollable form body — prevents buttons being clipped by keyboard */}
                        <ScrollView
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.scrollContent}
                        >
                            <Input
                                label="Reflection Text"
                                placeholder="What did you learn, feel, or discover?"
                                value={text}
                                onChangeText={setText}
                                multiline
                                numberOfLines={4}
                                style={{ minHeight: 100, textAlignVertical: 'top' }}
                            />

                            <Input
                                label="Image URL (Optional)"
                                placeholder="https://example.com/reflection.jpg"
                                value={imageUrl}
                                onChangeText={setImageUrl}
                                autoCapitalize="none"
                                keyboardType="url"
                            />

                            <Input
                                label="Link URL (Optional)"
                                placeholder="https://example.com/article"
                                value={linkUrl}
                                onChangeText={setLinkUrl}
                                autoCapitalize="none"
                                keyboardType="url"
                            />

                            <Input
                                label="Link Title (Optional)"
                                placeholder="Add a short title for the link"
                                value={linkCaption}
                                onChangeText={setLinkCaption}
                            />
                        </ScrollView>

                        {/* Actions — always visible at bottom, outside scroll */}
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
                                    (!text.trim() && !imageUrl.trim() && !linkUrl.trim()) && { opacity: 0.5 }
                                ]}
                                onPress={handleSave}
                                disabled={(!text.trim() && !imageUrl.trim() && !linkUrl.trim()) || loading}
                            >
                                <Text style={styles.saveText}>
                                    {loading ? 'Saving...' : 'Save Reflection'}
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
        flex: 1,
        width: '100%',
        justifyContent: 'flex-end',
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
    scrollContent: {
        paddingBottom: 4,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
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
