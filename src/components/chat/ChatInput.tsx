import { Send } from 'lucide-react-native';
import React, { useState } from 'react';
import { Platform, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';

interface ChatInputProps {
    onSend: (text: string) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend }) => {
    const [text, setText] = useState('');
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();

    const handleSend = () => {
        if (!text.trim()) return;
        onSend(text.trim());
        setText('');
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
            <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
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
                    disabled={!text.trim()}
                    style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        backgroundColor: text.trim() ? colors.primary : (colors.surface || '#FFFFFF'),
                        borderWidth: text.trim() ? 0 : 1,
                        borderColor: colors.border || '#E2E8F0',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                    activeOpacity={0.8}
                >
                    <Send size={20} color={text.trim() ? "white" : (colors.textMuted || "#94A3B8")} />
                </TouchableOpacity>
            </View>
        </View>
    );
};
