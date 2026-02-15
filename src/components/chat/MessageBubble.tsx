import React from 'react';
import { Image, Text, View } from 'react-native';
import { auth } from '../../../firebaseConfig';
import { useTheme } from '../../theme';
import { Message } from '../../types/chat';
import { formatMessageTime } from '../../utils/formatChatTimestamp';

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
        <View
            style={{
                flexDirection: 'row',
                justifyContent: isOwn ? 'flex-end' : 'flex-start',
                marginBottom: 12,
                paddingHorizontal: 4 // tiny gutter
            }}
        >
            {/* Avatar for others */}
            {!isOwn && (
                <View style={{ marginRight: 8, justifyContent: 'flex-end', marginBottom: 2 }}>
                    <View style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: colors.borderLight || '#e2e8f0',
                        overflow: 'hidden',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        {senderAvatar ? (
                            <Image source={{ uri: senderAvatar }} style={{ width: 32, height: 32 }} />
                        ) : (
                            <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.textSecondary }}>
                                {senderName ? senderName[0].toUpperCase() : '?'}
                            </Text>
                        )}
                    </View>
                </View>
            )}

            <View
                style={{
                    backgroundColor: isOwn ? colors.primary : colors.surface,
                    borderRadius: 20,
                    // Tear-drop effect
                    borderBottomRightRadius: isOwn ? 4 : 20,
                    borderBottomLeftRadius: !isOwn ? 4 : 20,

                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    maxWidth: '75%', // Maximum width constraint

                    // Shadow for minimal depth
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 2,
                    elevation: 1
                }}
            >
                {/* Sender Name (Group Chat - Optional) */}
                {!isOwn && senderName && (
                    <Text style={{
                        fontSize: 11,
                        color: colors.primary,
                        marginBottom: 4,
                        fontWeight: '600',
                        marginLeft: 2
                    }}>
                        {senderName}
                    </Text>
                )}

                <Text style={{
                    fontSize: 16,
                    lineHeight: 22,
                    color: isOwn ? 'white' : colors.textPrimary
                }}>
                    {message.text}
                </Text>

                <View style={{
                    flexDirection: 'row',
                    justifyContent: 'flex-end',
                    marginTop: 4
                }}>
                    <Text style={{
                        fontSize: 11,
                        color: isOwn ? 'rgba(255,255,255,0.7)' : colors.textMuted
                    }}>
                        {formatMessageTime(message.createdAt)}
                    </Text>
                </View>
            </View>
        </View>
    );
};
