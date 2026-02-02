import { Input } from '@/src/components/ui';
import { useTheme } from '@/src/theme';
import { Inspiration } from '@/src/types/item';
import { Image as ImageIcon, Link, Quote, X } from 'lucide-react-native';
import { useState } from 'react';
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface AddInspirationModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (type: Inspiration['type'], content: string, caption?: string) => void;
}

const TYPES: { id: Inspiration['type']; label: string; icon: any }[] = [
    { id: 'image', label: 'Image URL', icon: ImageIcon },
    { id: 'quote', label: 'Quote', icon: Quote },
    { id: 'link', label: 'Link', icon: Link },
];

export function AddInspirationModal({ visible, onClose, onSave }: AddInspirationModalProps) {
    const { colors } = useTheme();
    const [type, setType] = useState<Inspiration['type']>('quote');
    const [content, setContent] = useState('');
    const [caption, setCaption] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!content.trim()) return;
        setLoading(true);
        try {
            await onSave(type, content.trim(), caption.trim() || undefined);
            setContent('');
            setCaption('');
            setType('quote');
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const getPlaceholder = () => {
        switch (type) {
            case 'image': return 'https://example.com/image.jpg';
            case 'quote': return 'Enter the inspiring quote...';
            case 'link': return 'https://example.com/article';
        }
    };

    const getCaptionLabel = () => {
        switch (type) {
            case 'image': return 'Caption (optional)';
            case 'quote': return 'Author (optional)';
            case 'link': return 'Title (optional)';
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
                                Add Inspiration
                            </Text>
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <X size={24} color={colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        {/* Type Selector */}
                        <Text style={[styles.label, { color: colors.textSecondary }]}>
                            Type of inspiration:
                        </Text>
                        <View style={styles.typeContainer}>
                            {TYPES.map((t) => (
                                <TouchableOpacity
                                    key={t.id}
                                    style={[
                                        styles.typeButton,
                                        { backgroundColor: type === t.id ? colors.primary + '20' : colors.surface },
                                        { borderColor: type === t.id ? colors.primary : colors.border }
                                    ]}
                                    onPress={() => setType(t.id)}
                                >
                                    <t.icon size={18} color={type === t.id ? colors.primary : colors.textMuted} />
                                    <Text style={[
                                        styles.typeText,
                                        { color: type === t.id ? colors.primary : colors.textSecondary }
                                    ]}>
                                        {t.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Content */}
                        <Input
                            label={type === 'quote' ? 'Quote' : type === 'image' ? 'Image URL' : 'Link URL'}
                            placeholder={getPlaceholder()}
                            value={content}
                            onChangeText={setContent}
                            multiline={type === 'quote'}
                            numberOfLines={type === 'quote' ? 3 : 1}
                            autoCapitalize={type === 'quote' ? 'sentences' : 'none'}
                            keyboardType={type !== 'quote' ? 'url' : 'default'}
                        />

                        {/* Caption */}
                        <Input
                            label={getCaptionLabel()}
                            placeholder="Optional..."
                            value={caption}
                            onChangeText={setCaption}
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
                                    !content.trim() && { opacity: 0.5 }
                                ]}
                                onPress={handleSave}
                                disabled={!content.trim() || loading}
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
        marginBottom: 12,
    },
    typeContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    typeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    typeText: {
        fontSize: 13,
        fontWeight: '500',
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
