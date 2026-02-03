import { Send } from 'lucide-react-native';
import React, { useState } from 'react';
import { TextInput, TouchableOpacity, View } from 'react-native';

interface ChatInputProps {
    onSend: (text: string) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend }) => {
    const [text, setText] = useState('');

    const handleSend = () => {
        if (!text.trim()) return;
        onSend(text.trim());
        setText('');
    };

    return (
        <View className="px-4 pb-4 pt-2 bg-cream-50">
            <View className="flex-row items-end shadow-sm bg-white rounded-[24px] px-2 py-2 border border-black/5"
                style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 8,
                    elevation: 2
                }}
            >
                <TextInput
                    className="flex-1 text-base text-slate-800 px-4 py-2 min-h-[44px] max-h-[100px]"
                    placeholder="Message..."
                    placeholderTextColor="#94A3B8"
                    value={text}
                    onChangeText={setText}
                    multiline
                />

                <TouchableOpacity
                    onPress={handleSend}
                    disabled={!text.trim()}
                    className={`w-10 h-10 rounded-full items-center justify-center mb-1 ${text.trim() ? 'bg-indigo-500' : 'bg-slate-100'
                        }`}
                >
                    <Send size={18} color={text.trim() ? "white" : "#CBD5E1"} />
                </TouchableOpacity>
            </View>
        </View>
    );
};
