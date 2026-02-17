import * as ImagePicker from 'expo-image-picker';
import { ImagePlus, Send, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, Image, Platform, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';

interface ChatInputProps {
    onSend: (payload: { text: string; imageUri?: string | null }) => void;
    isSending?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, isSending = false }) => {
    const [text, setText] = useState('');
    const [imageUri, setImageUri] = useState<string | null>(null);
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const canSend = !!text.trim() || !!imageUri;

    const handleSend = () => {
        if (!canSend || isSending) return;
        onSend({ text: text.trim(), imageUri });
        setText('');
        setImageUri(null);
    };

    const handlePickImage = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
            Alert.alert('Permission Required', 'Please allow photo access to send images.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.9,
        });

        if (!result.canceled && result.assets[0]?.uri) {
            setImageUri(result.assets[0].uri);
        }
    };

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: colors.background,
                    borderTopColor: colors.border || '#E2E8F0',
                    paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 12) : 12,
                }
            ]}
        >
            {imageUri && (
                <View style={[styles.imagePreviewWrapper, { backgroundColor: colors.surface, borderColor: colors.border || '#E2E8F0' }]}>
                    <Image
                        source={{ uri: imageUri }}
                        style={styles.imagePreview}
                    />
                    <TouchableOpacity
                        onPress={() => setImageUri(null)}
                        style={[styles.removePreviewButton, { backgroundColor: colors.textPrimary }]}
                    >
                        <X size={14} color="white" />
                    </TouchableOpacity>
                </View>
            )}

            <View style={styles.inputRow}>
                <TouchableOpacity
                    onPress={handlePickImage}
                    style={[styles.imageButton, { borderColor: colors.border || '#E2E8F0', backgroundColor: colors.surface }]}
                    activeOpacity={0.8}
                >
                    <ImagePlus size={18} color={colors.textPrimary} />
                </TouchableOpacity>

                <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border || '#E2E8F0' }]}>
                    <TextInput
                        style={[styles.input, { color: colors.textPrimary || '#1E293B' }]}
                        placeholder="Message"
                        placeholderTextColor={colors.textMuted || "#94A3B8"}
                        value={text}
                        onChangeText={setText}
                        multiline
                    />
                </View>

                <TouchableOpacity
                    onPress={handleSend}
                    disabled={!canSend || isSending}
                    style={[
                        styles.sendButton,
                        {
                            backgroundColor: canSend && !isSending ? colors.primary : (colors.surface || '#FFFFFF'),
                            borderWidth: canSend && !isSending ? 0 : 1,
                            borderColor: colors.border || '#E2E8F0',
                        }
                    ]}
                    activeOpacity={0.8}
                >
                    <Send size={20} color={canSend && !isSending ? "white" : (colors.textMuted || "#94A3B8")} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderTopWidth: 1,
        paddingHorizontal: 16,
        paddingTop: 12,
    },
    imagePreviewWrapper: {
        marginBottom: 10,
        borderWidth: 1,
        borderRadius: 12,
        padding: 6,
        alignSelf: 'flex-start',
    },
    imagePreview: {
        width: 84,
        height: 84,
        borderRadius: 8,
    },
    removePreviewButton: {
        position: 'absolute',
        top: -8,
        right: -8,
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    imageButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    inputWrapper: {
        flex: 1,
        flexDirection: 'row',
        borderWidth: 1,
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 8,
        minHeight: 48,
        marginRight: 12,
        alignItems: 'center'
    },
    input: {
        flex: 1,
        fontSize: 16,
        maxHeight: 100,
        paddingTop: 0,
        paddingBottom: 0,
    },
    sendButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
