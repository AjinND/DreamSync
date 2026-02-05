import { useTheme } from '@/src/theme';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'expo-router';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { auth } from '../../../firebaseConfig';
import { Chat } from '../../types/chat';
import { Avatar } from '../ui/Avatar';

interface ChatListItemProps {
    chat: Chat;
}

export const ChatListItem: React.FC<ChatListItemProps> = ({ chat }) => {
    const router = useRouter();
    const { colors } = useTheme();
    const currentUserId = auth.currentUser?.uid;

    const isDM = chat.type === 'dm';
    // Logic to determine name/image would ideally be richer here
    const title = chat.name || (isDM ? "Direct Message" : "Journey Chat");
    const lastMsg = chat.lastMessage?.text || "No messages yet";
    const time = chat.lastMessage?.timestamp
        ? formatDistanceToNow(chat.lastMessage.timestamp, { addSuffix: true })
        : "";
    const unreadCount = (chat.unreadCounts && currentUserId) ? chat.unreadCounts[currentUserId] : 0;

    // Fallback logic for avatar
    const avatarUri = chat.photoUrl || undefined;

    return (
        <TouchableOpacity
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 12,
                paddingHorizontal: 16,
                backgroundColor: colors.surface,
                borderBottomWidth: 1,
                borderBottomColor: colors.border || '#f1f5f9'
            }}
            activeOpacity={0.7}
            onPress={() => router.push(`/chat/${chat.id}`)}
        >
            <Avatar
                uri={avatarUri}
                name={title}
                size="md"
            />

            <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                    <Text
                        style={{
                            fontSize: 16,
                            fontWeight: '600',
                            color: colors.textPrimary
                        }}
                        numberOfLines={1}
                    >
                        {title}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textMuted }}>{time}</Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text
                        style={{
                            fontSize: 14,
                            color: unreadCount > 0 ? colors.textPrimary : colors.textMuted,
                            fontWeight: unreadCount > 0 ? '600' : '400',
                            flex: 1,
                            marginRight: 8
                        }}
                        numberOfLines={1}
                    >
                        {chat.lastMessage?.senderId === currentUserId ? "You: " : ""}{lastMsg}
                    </Text>

                    {unreadCount > 0 && (
                        <View style={{
                            backgroundColor: colors.primary,
                            minWidth: 20,
                            height: 20,
                            borderRadius: 10,
                            alignItems: 'center',
                            justifyContent: 'center',
                            paddingHorizontal: 6
                        }}>
                            <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
                                {unreadCount}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
}
