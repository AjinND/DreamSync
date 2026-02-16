import * as ImagePicker from 'expo-image-picker';
import { ImagePlus, Send, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, Image, Platform, TextInput, TouchableOpacity, View } from 'react-native';
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
            style={{
                backgroundColor: colors.background, // Match screen background or strictly white
                borderTopWidth: 1,
                borderTopColor: colors.border || '#E2E8F0',
                paddingHorizontal: 16,
                paddingTop: 12,
                paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 12) : 12, // Handle safe area internally
            }}
        >
            {imageUri && (
                <View
                    style={{
                        marginBottom: 10,
                        backgroundColor: colors.surface,
                        borderWidth: 1,
                        borderColor: colors.border || '#E2E8F0',
                        borderRadius: 12,
                        padding: 6,
                        alignSelf: 'flex-start',
                    }}
                >
                    <Image
                        source={{ uri: imageUri }}
                        style={{ width: 84, height: 84, borderRadius: 8 }}
                    />
                    <TouchableOpacity
                        onPress={() => setImageUri(null)}
                        style={{
                            position: 'absolute',
                            top: -8,
                            right: -8,
                            width: 24,
                            height: 24,
                            borderRadius: 12,
                            backgroundColor: colors.textPrimary,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <X size={14} color="white" />
                    </TouchableOpacity>
                </View>
            )}

            <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                <TouchableOpacity
                    onPress={handlePickImage}
                    style={{
                        width: 42,
                        height: 42,
                        borderRadius: 21,
                        borderWidth: 1,
                        borderColor: colors.border || '#E2E8F0',
                        backgroundColor: colors.surface,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 8,
                    }}
                    activeOpacity={0.8}
                >
                    <ImagePlus size={18} color={colors.textPrimary} />
                </TouchableOpacity>

                <View
                    style={{
                        flex: 1,
                        flexDirection: 'row',
                        backgroundColor: colors.surface, // Start with White (Surface)
                        borderWidth: 1,
                        borderColor: colors.border || '#E2E8F0',
                        borderRadius: 24,
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        minHeight: 48,
                        marginRight: 12,
                        alignItems: 'center'
                    }}
                >
                    <TextInput
                        style={{
                            flex: 1,
                            fontSize: 16,
                            color: colors.textPrimary || '#1E293B',
                            maxHeight: 100,
                            paddingTop: 0,
                            paddingBottom: 0,
                        }}
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
                    style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        backgroundColor: canSend && !isSending ? colors.primary : (colors.surface || '#FFFFFF'),
                        borderWidth: canSend && !isSending ? 0 : 1,
                        borderColor: colors.border || '#E2E8F0',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                    activeOpacity={0.8}
                >
                    <Send size={20} color={canSend && !isSending ? "white" : (colors.textMuted || "#94A3B8")} />
                </TouchableOpacity>
            </View>
        </View>
    );
};
