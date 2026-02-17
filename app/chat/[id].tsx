import { FlashList } from '@shopify/flash-list';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { auth, db } from '@/firebaseConfig';
import { ChatInput } from '@/src/components/chat/ChatInput';
import { ChatRoomSkeleton } from '@/src/components/chat/ChatRoomSkeleton';
import { MessageBubble } from '@/src/components/chat/MessageBubble';
import { Avatar } from '@/src/components/ui/Avatar';
import { IconButton } from '@/src/components/ui/IconButton';
import { ChatService } from '@/src/services/chat';
import { JourneysService } from '@/src/services/journeys';
import { StoragePaths, StorageService } from '@/src/services/storage';
import { useChatStore } from '@/src/store/useChatStore';
import { useTheme } from '@/src/theme';
import { Message } from '@/src/types/chat';
import { ArrowLeft, ShieldCheck } from 'lucide-react-native';
import { createCooldownLimiter } from '@/src/utils/rateLimiter';

interface UserProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
}

export default function ChatRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { messages, enterChat, leaveChat, sendMessage, addPendingMessage, isLoading, activeChatId, chats } = useChatStore();

  const listRef = useRef<any>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const loadedProfileIdsRef = useRef<Set<string>>(new Set());
  const sendLimiterRef = useRef(createCooldownLimiter(1000));

  const currentChat = chats.find((c) => c.id === id);
  const title = currentChat?.name || (currentChat?.type === 'dm' ? 'Direct Message' : 'Journey Chat');

  const orderedMessages = useMemo(
    () => [...messages].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)),
    [messages],
  );

  useEffect(() => {
    const fetchProfiles = async () => {
      const participantIds = currentChat?.participants || [];
      if (!participantIds.length) return;

      const missingIds = participantIds.filter((uid) => !loadedProfileIdsRef.current.has(uid));
      if (missingIds.length === 0) return;

      const newProfiles: Record<string, UserProfile> = {};
      await Promise.all(
        missingIds.map(async (uid) => {
          try {
            const userDoc = await getDoc(doc(db, 'users', uid));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              newProfiles[uid] = {
                uid,
                displayName: userData.displayName || 'User',
                photoURL: userData.photoURL,
              };
            }
          } catch (e) {
            console.warn(`Failed to fetch profile for ${uid}`, e);
          }
        }),
      );

      if (Object.keys(newProfiles).length > 0) {
        Object.keys(newProfiles).forEach((uid) => loadedProfileIdsRef.current.add(uid));
        setProfiles((prev) => ({ ...prev, ...newProfiles }));
      }
    };

    fetchProfiles();
  }, [currentChat?.participants]);

  useEffect(() => {
    const initChat = async () => {
      if (!id) return;

      if (id.startsWith('journey_')) {
        setIsInitializing(true);
        try {
          const journeyId = id.replace('journey_', '');
          const existingChatDoc = await getDoc(doc(db, 'chats', id));

          if (!existingChatDoc.exists()) {
            const journey = await JourneysService.getJourneyById(journeyId);
            if (journey && journey.participants.length >= 2) {
              await ChatService.createJourneyChat(
                journeyId,
                journey.participants,
                journey.preview?.title,
                journey.preview?.image,
              );
            }
          }
        } catch (e) {
          console.error('Failed to init legacy chat', e);
        } finally {
          setIsInitializing(false);
        }
      }

      enterChat(id);
    };

    initChat();
    return () => leaveChat();
  }, [id, enterChat, leaveChat]);

  const handleSend = async (payload: { text: string; imageUri?: string | null }) => {
    if (!id) return;
    if (!sendLimiterRef.current.allow(`chat_send_${id}`)) return;

    const trimmedText = payload.text.trim();
    const imageUri = payload.imageUri;
    if (!trimmedText && !imageUri) return;

    const warnIfUnencrypted = (reason?: string) => {
      if (!reason) return;
      Alert.alert(
        'Message Sent Without Encryption',
        `This message was sent without end-to-end encryption (${reason.replaceAll('_', ' ')}).`
      );
    };

    setIsSendingMessage(true);
    try {
      if (imageUri) {
        const currentUserId = auth.currentUser?.uid;
        if (!currentUserId) throw new Error('Not authenticated');

        const clientId = `client_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const uploadMessageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        addPendingMessage({
          text: trimmedText,
          type: 'image',
          mediaUrl: imageUri,
          clientId,
        });

        const mediaUrl = await StorageService.uploadOptimizedImage(
          imageUri,
          StoragePaths.chatMessage(id, currentUserId, uploadMessageId),
          'chatMessage',
        );

        const result = await sendMessage({
          text: trimmedText,
          type: 'image',
          mediaUrl,
          clientId,
          skipOptimistic: true,
        });
        if (!result.encrypted) warnIfUnencrypted(result.reason);
        return;
      }

      const result = await sendMessage({ text: trimmedText, type: 'text' });
      if (!result.encrypted) warnIfUnencrypted(result.reason);
    } catch (error: any) {
      Alert.alert('Message Failed', error?.message || 'Unable to send message right now.');
    } finally {
      setIsSendingMessage(false);
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

  const memberCount = currentChat?.participants?.length || 0;
  const headerSubtitle = memberCount
    ? `${memberCount} ${memberCount === 1 ? 'member' : 'members'}`
    : 'Chat details';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: colors.background,
        }}
      >
        <IconButton icon={ArrowLeft} onPress={() => router.back()} variant='ghost' size={22} />

        <Pressable
          onPress={() => router.push(`/chat/info/${id}`)}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}
        >
          <Avatar uri={currentChat?.photoUrl || undefined} name={title} size='md' />
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }} numberOfLines={1}>
              {title}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>{headerSubtitle}</Text>
              {currentChat?.encryptionEnabled && (
                <View
                  style={{
                    marginLeft: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 8,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    backgroundColor: colors.surface,
                  }}
                >
                  <ShieldCheck size={12} color={colors.primary} />
                  <Text style={{ fontSize: 11, color: colors.textSecondary, marginLeft: 4 }}>E2E</Text>
                </View>
              )}
            </View>
          </View>
        </Pressable>
      </View>

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
          <ChatInput onSend={handleSend} isSending={isSendingMessage} />
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}
