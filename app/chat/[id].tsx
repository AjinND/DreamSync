import { FlashList } from '@shopify/flash-list';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, Camera, Pencil } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { auth, db } from '@/firebaseConfig';
import { StoragePaths, StorageService } from '@/src/services/storage';
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
    const listRef = useRef<any>(null);
    const [isInitializing, setIsInitializing] = useState(false);
    const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [groupNameDraft, setGroupNameDraft] = useState('');
    const [groupPhotoDraft, setGroupPhotoDraft] = useState<string | null>(null);
    const [isSavingGroupDetails, setIsSavingGroupDetails] = useState(false);

    // Find chat metadata to display title
    const currentChat = chats.find(c => c.id === id);
    const isJourneyChat = currentChat?.type === 'journey';
    const title = currentChat?.name || (currentChat?.type === 'dm' ? 'Direct Message' : 'Journey Chat');
    const orderedMessages = useMemo(
        () => [...messages].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)),
        [messages]
    );

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

            // Legacy Handling - Initialize journey chat if needed (only for 2+ participants)
            if (id.startsWith('journey_') && !currentChat) {
                setIsInitializing(true);
                try {
                    const journeyId = id.replace('journey_', '');
                    const journey = await JourneysService.getJourneyById(journeyId);
                    if (journey && journey.participants.length >= 2) {
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

            // Always enter chat to subscribe to messages
            enterChat(id);
        };

        initChat();
        return () => leaveChat();
    }, [id]);

    const handleSend = (text: string) => {
        sendMessage(text);
    };

    const openEditModal = () => {
        if (!currentChat || currentChat.type !== 'journey') return;
        setGroupNameDraft(currentChat.name || 'Journey Chat');
        setGroupPhotoDraft(currentChat.photoUrl || null);
        setIsEditModalVisible(true);
    };

    const handlePickGroupPhoto = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
            Alert.alert('Permission Required', 'Please allow photo access to set a group image.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.9,
        });

        if (!result.canceled && result.assets[0]?.uri) {
            setGroupPhotoDraft(result.assets[0].uri);
        }
    };

    const handleSaveGroupDetails = async () => {
        if (!id || !isJourneyChat) return;

        const trimmedName = groupNameDraft.trim();
        if (!trimmedName) {
            Alert.alert('Name Required', 'Please enter a group name.');
            return;
        }

        setIsSavingGroupDetails(true);
        try {
            let nextPhotoUrl = groupPhotoDraft ?? null;

            if (nextPhotoUrl && !nextPhotoUrl.startsWith('https://')) {
                const currentUserId = auth.currentUser?.uid;
                if (!currentUserId) {
                    throw new Error('Not authenticated');
                }

                nextPhotoUrl = await StorageService.uploadOptimizedImage(
                    nextPhotoUrl,
                    StoragePaths.chatGroupPhoto(id),
                    'coverImage'
                );
            }

            await ChatService.updateJourneyChatDetails(id, {
                name: trimmedName,
                photoUrl: nextPhotoUrl,
            });

            setIsEditModalVisible(false);
        } catch (error: any) {
            Alert.alert('Update Failed', error?.message || 'Failed to update group details. Please try again.');
        } finally {
            setIsSavingGroupDetails(false);
        }
    };

    useEffect(() => {
        if (orderedMessages.length === 0) return;
        const timeout = setTimeout(() => {
            listRef.current?.scrollToEnd({ animated: false });
        }, 0);
        return () => clearTimeout(timeout);
    }, [orderedMessages.length, activeChatId]);

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
                rightAction={
                    isJourneyChat ? (
                        <IconButton
                            icon={Pencil}
                            onPress={openEditModal}
                            variant="ghost"
                            size={20}
                        />
                    ) : undefined
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
                        ref={listRef}
                        data={orderedMessages}
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
                        style={{ flex: 1 }}
                    />
                    <ChatInput onSend={handleSend} />
                </KeyboardAvoidingView>
            )}

            <Modal
                visible={isEditModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setIsEditModalVisible(false)}
            >
                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.45)',
                    justifyContent: 'center',
                    paddingHorizontal: 20,
                }}>
                    <View style={{
                        backgroundColor: colors.background,
                        borderRadius: 16,
                        padding: 16,
                        borderWidth: 1,
                        borderColor: colors.border,
                    }}>
                        <Text style={{
                            fontSize: 18,
                            fontWeight: '700',
                            color: colors.textPrimary,
                            marginBottom: 14,
                        }}>
                            Edit Group
                        </Text>

                        <TouchableOpacity
                            onPress={handlePickGroupPhoto}
                            activeOpacity={0.85}
                            style={{ alignSelf: 'center', marginBottom: 14 }}
                        >
                            <View style={{
                                width: 84,
                                height: 84,
                                borderRadius: 42,
                                backgroundColor: colors.surface,
                                borderWidth: 1,
                                borderColor: colors.border,
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden'
                            }}>
                                {groupPhotoDraft ? (
                                    <Image source={{ uri: groupPhotoDraft }} style={{ width: 84, height: 84 }} />
                                ) : (
                                    <Camera size={22} color={colors.textMuted} />
                                )}
                            </View>
                        </TouchableOpacity>

                        <TextInput
                            value={groupNameDraft}
                            onChangeText={setGroupNameDraft}
                            placeholder="Group name"
                            placeholderTextColor={colors.textMuted}
                            style={{
                                borderWidth: 1,
                                borderColor: colors.border,
                                borderRadius: 12,
                                paddingHorizontal: 12,
                                paddingVertical: 10,
                                fontSize: 16,
                                color: colors.textPrimary,
                                marginBottom: 14,
                            }}
                        />

                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                            <Pressable
                                onPress={() => setIsEditModalVisible(false)}
                                style={{
                                    paddingHorizontal: 14,
                                    paddingVertical: 9,
                                    borderRadius: 10,
                                    backgroundColor: colors.surface,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                }}
                            >
                                <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>Cancel</Text>
                            </Pressable>
                            <Pressable
                                onPress={handleSaveGroupDetails}
                                disabled={isSavingGroupDetails}
                                style={{
                                    paddingHorizontal: 14,
                                    paddingVertical: 9,
                                    borderRadius: 10,
                                    backgroundColor: colors.primary,
                                    opacity: isSavingGroupDetails ? 0.7 : 1,
                                    marginLeft: 10,
                                }}
                            >
                                <Text style={{ color: 'white', fontWeight: '700' }}>
                                    {isSavingGroupDetails ? 'Saving...' : 'Save'}
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
