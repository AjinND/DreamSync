import { Stack } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { ChatListItem } from '../../src/components/chat/ChatListItem';
import { useChatStore } from '../../src/stores/useChatStore';

export default function ChatListScreen() {
    const { chats, fetchChats, isLoading } = useChatStore();

    useEffect(() => {
        fetchChats();
        syncMissingChats(); // Auto-fix legacy journeys
    }, []);

    const syncMissingChats = async () => {
        // This is a self-healing function to create chat rooms for journeys that have none
        // It runs silently in the background
        try {
            const { auth } = require('@/firebaseConfig');
            const { JourneysService } = require('@/src/services/journeys');
            const { ChatService } = require('@/src/services/chat');

            if (!auth.currentUser) return;

            const myJourneys = await JourneysService.getUserJourneys(auth.currentUser.uid);

            // We can't easily check if chat exists without querying ALL chats (which we have in store eventually)
            // But we can just try to create them idempotently if we suspect they are missing. 
            // Better: "createJourneyChat" checks if doc exists. So it IS safe to call.

            // To avoid spamming, maybe we only do it if we have 0 chats? 
            // Or just do it for all active journeys (limit 10?).
            // For now, let's just do it for all. It's a one-time migration cost effectively.

            for (const journey of myJourneys) {
                await ChatService.createJourneyChat(
                    journey.id,
                    journey.participants,
                    journey.preview?.title,
                    journey.preview?.image
                );
            }
        } catch (e) {
            console.error("Auto-sync chats failed", e);
        }
    };

    return (
        <View className="flex-1 bg-cream-50">
            <Stack.Screen
                options={{
                    title: "Messages",
                    headerShadowVisible: false,
                    headerStyle: { backgroundColor: '#FEFBF6' }, // cream-50
                    headerTintColor: '#1E293B' // slate-800
                }}
            />

            {isLoading && chats.length === 0 ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#A78BFA" />
                </View>
            ) : (
                <FlatList
                    data={chats}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => <ChatListItem chat={item} />}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    ListEmptyComponent={
                        <View className="flex-1 justify-center items-center mt-20 p-5">
                            <Text className="text-slate-400 text-lg text-center">No messages yet.</Text>
                            <Text className="text-slate-300 text-sm text-center mt-2">
                                Join a journey to start chatting!
                            </Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}
