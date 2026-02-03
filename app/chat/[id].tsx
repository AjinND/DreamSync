import { db } from '@/firebaseConfig';
import { ChatService } from '@/src/services/chat';
import { JourneysService } from '@/src/services/journeys';
import { useChatStore } from '@/src/stores/useChatStore';
import { useTheme } from '@/src/theme';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { ChatInput } from '../../src/components/chat/ChatInput';
import { MessageBubble } from '../../src/components/chat/MessageBubble';

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
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: colors.background }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <Stack.Screen
                options={{
                    title: title,
                    headerShadowVisible: false,
                    headerStyle: { backgroundColor: colors.background },
                    headerTintColor: colors.textPrimary,
                    headerTitleStyle: { fontWeight: '600' }
                }}
            />

            {(isLoading || isInitializing) && messages.length === 0 ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color={colors.primary} />
                    {isInitializing && <Text style={{ marginTop: 8, color: colors.textMuted }}>Syncing chat...</Text>}
                </View>
            ) : (
                <FlatList
                    data={messages}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                        <MessageBubble
                            message={item}
                            senderName={profiles[item.senderId]?.displayName}
                            senderAvatar={profiles[item.senderId]?.photoURL}
                        />
                    )}
                    contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
                    inverted
                />
            )}

            <ChatInput onSend={handleSend} />
        </KeyboardAvoidingView>
    );
}
