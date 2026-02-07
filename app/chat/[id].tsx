import { FlashList } from '@shopify/flash-list';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { ArrowLeft } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { db } from '@/firebaseConfig';
import { ChatService } from '@/src/services/chat';
import { JourneysService } from '@/src/services/journeys';
import { useChatStore } from '@/src/stores/useChatStore';
import { useTheme } from '@/src/theme';
import { Message } from '@/src/types/chat';
import { ChatInput } from '../../src/components/chat/ChatInput';
import { ChatRoomSkeleton } from '../../src/components/chat/ChatRoomSkeleton';
import { MessageBubble } from '../../src/components/chat/MessageBubble';
import { Header } from '../../src/components/shared/Header';
import { IconButton } from '../../src/components/ui/IconButton';

interface UserProfile {
    uid: string;
    displayName: string;
    photoURL?: string;
}

export default function ChatRoomScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { colors } = useTheme();
    const { messages, enterChat, leaveChat, sendMessage, isLoading, activeChatId, chats } = useChatStore();
    const [isInitializing, setIsInitializing] = useState(false);
    const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});

    // Find chat metadata to display title
    const currentChat = chats.find(c => c.id === id);
    const title = currentChat?.name || (currentChat?.type === 'dm' ? 'Direct Message' : 'Journey Chat');

    // Fetch User Profiles
    useEffect(() => {
        const fetchProfiles = async () => {
            if (!currentChat?.participants) return;

            const newProfiles: Record<string, UserProfile> = {};
            const missingIds = currentChat.participants.filter(uid => !profiles[uid]);

            if (missingIds.length === 0) return;

            // In a real app, use a bulk query (where 'uid' in [...])
            // For now, doing parallel fetches
            await Promise.all(missingIds.map(async (uid) => {
                try {
                    const userDoc = await getDoc(doc(db, 'users', uid));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        newProfiles[uid] = {
                            uid,
                            displayName: userData.displayName || 'User',
                            photoURL: userData.photoURL
                        };
                    }
                } catch (e) {
                    console.warn(`Failed to fetch profile for ${uid}`, e);
                }
            }));

            setProfiles(prev => ({ ...prev, ...newProfiles }));
        };

        fetchProfiles();
    }, [currentChat?.participants]);

    useEffect(() => {
        const initChat = async () => {
            if (!id) return;

            enterChat(id);

            // Legacy Handling
            if (id.startsWith('journey_')) {
                const journeyId = id.replace('journey_', '');
                if (!currentChat) {
                    setIsInitializing(true);
                    try {
                        const journey = await JourneysService.getJourneyById(journeyId);
                        if (journey) {
                            await ChatService.createJourneyChat(
                                journeyId,
                                journey.participants,
                                journey.preview?.title,
                                journey.preview?.image
                            );
                        }
                    } catch (e) {
                        console.error("Failed to init legacy chat", e);
                    } finally {
                        setIsInitializing(false);
                    }
                }
            }
        };

        initChat();
        return () => leaveChat();
    }, [id, currentChat]);

    const handleSend = (text: string) => {
        sendMessage(text);
    };

    if (!id) return null;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            <Header
                title={title}
                leftAction={
                    <IconButton
                        icon={ArrowLeft}
                        onPress={() => router.back()}
                        variant="ghost"
                        size={24}
                    />
                }
            />

            {(isLoading || isInitializing) && messages.length === 0 ? (
                <ChatRoomSkeleton />
            ) : (
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                >
                    <FlashList<Message>
                        data={messages}
                        keyExtractor={(item: Message) => item.id}
                        renderItem={({ item }: { item: Message }) => (
                            <MessageBubble
                                message={item}
                                senderName={profiles[item.senderId]?.displayName}
                                senderAvatar={profiles[item.senderId]?.photoURL}
                            />
                        )}
                        estimatedItemSize={100}
                        contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
                        inverted={true}
                        style={{ flex: 1 }}
                    />
                    <ChatInput onSend={handleSend} />
                </KeyboardAvoidingView>
            )}
        </SafeAreaView>
    );
}
