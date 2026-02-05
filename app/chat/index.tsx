import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, MessageSquare } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChatListItem } from '../../src/components/chat/ChatListItem';
import { EmptyState } from '../../src/components/shared/EmptyState';
import { Header } from '../../src/components/shared/Header';
import { LoadingState } from '../../src/components/shared/LoadingState';
import { IconButton } from '../../src/components/ui/IconButton';
import { useChatStore } from '../../src/stores/useChatStore';
import { useTheme } from '../../src/theme';

export default function ChatListScreen() {
    const router = useRouter();
    const { chats, fetchChats, isLoading } = useChatStore();
    const { colors } = useTheme();

    useEffect(() => {
        fetchChats();
        syncMissingChats(); // Auto-fix legacy journeys
    }, []);

    const syncMissingChats = async () => {
        try {
            const { auth } = require('@/firebaseConfig');
            const { JourneysService } = require('@/src/services/journeys');
            const { ChatService } = require('@/src/services/chat');

            if (!auth.currentUser) return;

            const myJourneys = await JourneysService.getUserJourneys(auth.currentUser.uid);
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
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            <Header
                title="Messages"
                subtitle={chats.length > 0 ? `${chats.length} active` : undefined}
                leftAction={
                    <IconButton
                        icon={ArrowLeft}
                        onPress={() => router.back()}
                        variant="ghost"
                        size={24}
                    />
                }
            />

            {isLoading && chats.length === 0 ? (
                <LoadingState message="Loading chats..." />
            ) : (
                <FlatList
                    data={chats}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => <ChatListItem chat={item} />}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    ListEmptyComponent={
                        <EmptyState
                            icon={MessageSquare}
                            title="No messages yet"
                            description="Join a journey to start chatting with your fellow dreamers!"
                            action={{
                                label: "Find a Journey",
                                onPress: () => { } // Ideally navigate to Explore
                            }}
                        />
                    }
                />
            )}
        </SafeAreaView>
    );
}
