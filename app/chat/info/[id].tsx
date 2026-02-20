import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, Camera, Pencil } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { db } from '@/firebaseConfig';
import { Avatar } from '@/src/components/ui/Avatar';
import { IconButton } from '@/src/components/ui/IconButton';
import { ChatService } from '@/src/services/chat';
import { StoragePaths, StorageService } from '@/src/services/storage';
import { useChatStore } from '@/src/store/useChatStore';
import { useTheme } from '@/src/theme';
import { Message } from '@/src/types/chat';

interface UserProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
}

export default function ChatInfoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { chats } = useChatStore();
  const currentChat = chats.find((c) => c.id === id);

  const [messages, setMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [groupNameDraft, setGroupNameDraft] = useState('');
  const [groupPhotoDraft, setGroupPhotoDraft] = useState<string | null>(null);
  const [isSavingGroupDetails, setIsSavingGroupDetails] = useState(false);

  const title = currentChat?.name || (currentChat?.type === 'dm' ? 'Direct Message' : 'Journey Chat');
  const participantIds = useMemo(
    () => currentChat?.participants || [],
    [currentChat?.participants],
  );
  const mediaMessages = useMemo(
    () => messages.filter((msg) => !!msg.mediaUrl),
    [messages],
  );

  useEffect(() => {
    if (!id) return;
    const unsubscribe = ChatService.subscribeToMessages(id, (next) => setMessages(next));
    return () => unsubscribe();
  }, [id]);

  useEffect(() => {
    const fetchProfiles = async () => {
      if (!participantIds.length) return;
      const missingIds = participantIds.filter((uid) => !profiles[uid]);
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
        setProfiles((prev) => ({ ...prev, ...newProfiles }));
      }
    };

    fetchProfiles();
  }, [participantIds, profiles]);

  const participantProfiles = useMemo(
    () =>
      participantIds.map((uid) => ({
        uid,
        displayName: profiles[uid]?.displayName || 'User',
        photoURL: profiles[uid]?.photoURL,
      })),
    [participantIds, profiles],
  );

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
    if (!id || currentChat?.type !== 'journey') return;
    const trimmedName = groupNameDraft.trim();
    if (!trimmedName) {
      Alert.alert('Name Required', 'Please enter a group name.');
      return;
    }

    setIsSavingGroupDetails(true);
    try {
      let nextPhotoUrl = groupPhotoDraft ?? null;
      if (nextPhotoUrl && !nextPhotoUrl.startsWith('https://')) {
        nextPhotoUrl = await StorageService.uploadOptimizedImage(
          nextPhotoUrl,
          StoragePaths.chatGroupPhoto(id),
          'coverImage',
        );
      }

      await ChatService.updateJourneyChatDetails(id, {
        name: trimmedName,
        photoUrl: nextPhotoUrl,
      });

      setIsEditModalVisible(false);
    } catch (error: any) {
      Alert.alert('Update Failed', error?.message || 'Failed to update group details.');
    } finally {
      setIsSavingGroupDetails(false);
    }
  };

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
        }}
      >
        <IconButton icon={ArrowLeft} onPress={() => router.back()} variant='ghost' size={22} accessibilityLabel="Go back" />
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: colors.textPrimary }}>Chat Info</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28 }}>
        <View style={{ alignItems: 'center', marginBottom: 16 }}>
          <Avatar uri={currentChat?.photoUrl || undefined} name={title} size='xl' />
          <Text style={{ marginTop: 10, fontSize: 18, fontWeight: '700', color: colors.textPrimary }}>{title}</Text>
          <Text style={{ marginTop: 4, fontSize: 13, color: colors.textSecondary }}>
            {participantIds.length} {participantIds.length === 1 ? 'member' : 'members'}
          </Text>
        </View>

        {currentChat?.type === 'journey' && (
          <Pressable
            onPress={openEditModal}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 12,
              paddingVertical: 10,
              marginBottom: 14,
              backgroundColor: colors.surface,
            }}
          >
            <Pencil size={16} color={colors.textPrimary} />
            <Text style={{ marginLeft: 8, color: colors.textPrimary, fontWeight: '600' }}>Edit Group</Text>
          </Pressable>
        )}

        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 }}>Participants</Text>
        {participantProfiles.length === 0 ? (
          <Text style={{ color: colors.textSecondary, marginBottom: 16 }}>No participants available.</Text>
        ) : (
          <View style={{ marginBottom: 16 }}>
            {participantProfiles.map((item) => (
              <View key={item.uid} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}>
                <Avatar uri={item.photoURL} name={item.displayName} size='sm' />
                <Text style={{ marginLeft: 10, color: colors.textPrimary, fontSize: 15 }}>{item.displayName}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 }}>Shared Media</Text>
        {mediaMessages.length === 0 ? (
          <Text style={{ color: colors.textSecondary }}>No shared media yet.</Text>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
            {mediaMessages.map((item) => (
              <View key={item.id} style={{ width: '33.33%', padding: 4 }}>
                <Image
                  source={{ uri: item.mediaUrl }}
                  style={{ width: '100%', aspectRatio: 1, borderRadius: 8, backgroundColor: colors.surface }}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={isEditModalVisible}
        transparent
        animationType='fade'
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.45)',
            justifyContent: 'center',
            paddingHorizontal: 20,
          }}
        >
          <View
            style={{
              backgroundColor: colors.background,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 14 }}>Edit Group</Text>
            <TouchableOpacity onPress={handlePickGroupPhoto} activeOpacity={0.85} style={{ alignSelf: 'center', marginBottom: 14 }}>
              <View
                style={{
                  width: 84,
                  height: 84,
                  borderRadius: 42,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
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
              placeholder='Group name'
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
                <Text style={{ color: 'white', fontWeight: '700' }}>{isSavingGroupDetails ? 'Saving...' : 'Save'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
