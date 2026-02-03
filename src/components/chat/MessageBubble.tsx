import { format } from 'date-fns';
import React from 'react';
import { Image, Text, View } from 'react-native';
import { auth } from '../../../firebaseConfig';
import { useTheme } from '../../theme';
import { Message } from '../../types/chat';

interface MessageBubbleProps {
    message: Message;
    // Optional: Pass sender details if available in parent
    senderName?: string;
    senderAvatar?: string | null;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, senderName, senderAvatar }) => {
    const isOwn = message.senderId === auth.currentUser?.uid;
    const { colors } = useTheme();

    return (
        <View className={`mb-3 flex-row ${isOwn ? 'justify-end' : 'justify-start items-end gap-2'}`}>

            {/* Avatar for others */}
            {!isOwn && (
                <View className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden mb-1 justify-center items-center">
                    {senderAvatar ? (
                        <Image source={{ uri: senderAvatar }} className="w-full h-full" />
                    ) : (
                        <Text className="text-xs font-bold text-slate-500">
                            {senderName ? senderName[0].toUpperCase() : '?'}
                        </Text>
                    )}
                </View>
            )}

            <View
                style={{
                    backgroundColor: isOwn ? colors.primary : colors.surface,
                    borderBottomRightRadius: isOwn ? 4 : 20,
                    borderBottomLeftRadius: !isOwn ? 4 : 20,
                    borderTopLeftRadius: 20,
                    borderTopRightRadius: 20,
                    // Shadow for non-owned messages
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: isOwn ? 0 : 0.05,
                    shadowRadius: 2,
                    elevation: isOwn ? 0 : 1,
                    maxWidth: '75%'
                }}
                className={`px-4 py-3`}
            >
                {/* Sender Name (Group Chat - Optional) */}
                {!isOwn && senderName && (
                    <Text className="text-xs text-slate-400 mb-1 ml-1">{senderName}</Text>
                )}

                <Text className={`text-base leading-5 ${isOwn ? 'text-white' : 'text-slate-800'}`}>
                    {message.text}
                </Text>

                <View className="flex-row justify-end mt-1">
                    <Text className={`text-[10px] ${isOwn ? 'text-white/70' : 'text-slate-400'}`}>
                        {format(message.createdAt, 'h:mm a')}
                    </Text>
                </View>
            </View>
        </View>
    );
};
