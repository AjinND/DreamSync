import { useTheme } from '@/src/theme';
import { useRouter } from 'expo-router';
import { formatChatListTime } from '../../utils/formatChatTimestamp';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { auth } from '../../../firebaseConfig';
import { Chat } from '../../types/chat';
import { Avatar } from '../ui/Avatar';

interface ChatListItemProps {
    chat: Chat;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const ChatListItem: React.FC<ChatListItemProps> = ({ chat }) => {
    const router = useRouter();
    const { colors } = useTheme();
    const currentUserId = auth.currentUser?.uid;

    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
        scale.value = withSpring(0.98, { damping: 10, stiffness: 300 });
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 10, stiffness: 300 });
    };

    const isDM = chat.type === 'dm';
    const title = chat.name || (isDM ? "Direct Message" : "Journey Chat");
    const rawLastMessage = chat.lastMessage?.text || "No messages yet";
    const normalizedLastMessage = ['[encrypted message]', '[encrypted]', 'encrypted message'].includes(
        rawLastMessage.trim().toLowerCase()
    )
        ? 'New message'
        : rawLastMessage;
    const time = chat.lastMessage?.timestamp
        ? formatChatListTime(chat.lastMessage.timestamp)
        : "";
    const unreadCount = (chat.unreadCounts && currentUserId) ? chat.unreadCounts[currentUserId] : 0;
    const avatarUri = chat.photoUrl || undefined;

    return (
        <AnimatedPressable
            style={[
                {
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    backgroundColor: colors.surface,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border || '#f1f5f9'
                },
                animatedStyle
            ]}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
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
                        {chat.lastMessage?.senderId === currentUserId ? "You: " : ""}{normalizedLastMessage}
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
        </AnimatedPressable>
    );
}
