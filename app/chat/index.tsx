import { FlashList } from '@shopify/flash-list';
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, MessageSquare } from 'lucide-react-native';
import { View as MotiView } from 'moti';
import React, { useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChatListItem } from '../../src/components/chat/ChatListItem';
import { ChatListSkeleton } from '../../src/components/chat/ChatListSkeleton';
import { EmptyState } from '../../src/components/shared/EmptyState';
import { Header } from '../../src/components/shared/Header';
import { IconButton } from '../../src/components/ui/IconButton';
import { useChatStore } from '../../src/stores/useChatStore';
import { useTheme } from '../../src/theme';
import { Chat } from '../../src/types/chat';

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
            const eligible = myJourneys.filter((j: { participants: string[] }) => j.participants.length >= 2);
            for (const journey of eligible) {
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
                <ChatListSkeleton />
            ) : (
                <FlashList<Chat>
                    data={chats}
                    keyExtractor={(item: Chat) => item.id}
                    renderItem={({ item, index }: { item: Chat, index: number }) => (
                        <MotiView
                            from={{ opacity: 0, translateY: 10 }}
                            animate={{ opacity: 1, translateY: 0 }}
                            transition={{ delay: index * 100, type: 'timing', duration: 350 }}
                        >
                            <ChatListItem chat={item} />
                        </MotiView>
                    )}
                    estimatedItemSize={72}
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
