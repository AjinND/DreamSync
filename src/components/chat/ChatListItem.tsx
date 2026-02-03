import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'expo-router';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { auth } from '../../../firebaseConfig';
import { Chat } from '../../types/chat';

interface ChatListItemProps {
    chat: Chat;
}

export const ChatListItem: React.FC<ChatListItemProps> = ({ chat }) => {
    const router = useRouter();
    const currentUserId = auth.currentUser?.uid;

    // Determine title and image based on chat type
    // Note: In a real app, we'd need to fetch the other user's profile if it's a DM
    // For MVP, we might show "User" or need a cache of user profiles.
    // Assuming for now we resolve this in the Service or Store, or just show generic.

    // Improved logic: The Chat object should optimally have a "display info" attached by the store/service
    // but for now let's keep it simple.

    const isDM = chat.type === 'dm';
    const title = chat.name || (isDM ? "Direct Message" : "Journey Chat");
    const lastMsg = chat.lastMessage?.text || "No messages yet";
    const time = chat.lastMessage?.timestamp
        ? formatDistanceToNow(chat.lastMessage.timestamp, { addSuffix: true })
        : "";
    const unreadCount = (chat.unreadCounts && currentUserId) ? chat.unreadCounts[currentUserId] : 0;

    return (
        <TouchableOpacity
            className="flex-row items-center p-4 border-b border-gray-100 bg-white active:bg-gray-50"
            onPress={() => router.push(`/chat/${chat.id}`)}
        >
            <View className="w-12 h-12 rounded-full bg-indigo-100 items-center justify-center mr-4">
                <Text className="text-indigo-600 font-bold text-lg">
                    {title.charAt(0)}
                </Text>
            </View>

            <View className="flex-1">
                <View className="flex-row justify-between items-center mb-1">
                    <Text className="font-bold text-slate-800 text-base">{title}</Text>
                    <Text className="text-xs text-slate-400">{time}</Text>
                </View>
                <View className="flex-row justify-between items-center">
                    <Text className="text-slate-500 text-sm truncate" numberOfLines={1}>
                        {chat.lastMessage?.senderId === currentUserId ? "You: " : ""}{lastMsg}
                    </Text>
                    {unreadCount > 0 && (
                        <View className="bg-coral-500 min-w-[20px] h-5 rounded-full items-center justify-center px-1.5 ml-2">
                            <Text className="text-white text-xs font-bold">{unreadCount}</Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
}
