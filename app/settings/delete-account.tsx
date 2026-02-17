import { Header } from '@/src/components/shared';
import { IconButton } from '@/src/components/ui';
import { AccountDeletionService } from '@/src/services/accountDeletion';
import { getUserMessage } from '@/src/utils/AppError';
import { ChevronLeft } from 'lucide-react-native';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/src/theme';

export default function DeleteAccountScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [confirmation, setConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [progress, setProgress] = useState('');

  const canDelete = confirmation.trim().toUpperCase() === 'DELETE' && !isDeleting;

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              await AccountDeletionService.deleteCurrentAccount(setProgress);
              Alert.alert('Account Deleted', 'Your account was permanently deleted.');
              router.replace('/(auth)/login');
            } catch (error) {
              Alert.alert('Deletion Failed', getUserMessage(error));
            } finally {
              setIsDeleting(false);
              setProgress('');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <Header
        title="Delete Account"
        leftAction={<IconButton icon={ChevronLeft} onPress={() => router.back()} variant="ghost" />}
      />

      <View style={styles.content}>
        <Text style={[styles.warningTitle, { color: colors.error }]}>Permanent action</Text>
        <Text style={[styles.warningText, { color: colors.textSecondary }]}>
          Deleting your account removes your profile, dreams, chat content, and private encryption data.
        </Text>

        <Text style={[styles.label, { color: colors.textPrimary }]}>Type DELETE to confirm</Text>
        <TextInput
          style={[
            styles.input,
            {
              borderColor: colors.border,
              backgroundColor: colors.surface,
              color: colors.textPrimary,
            },
          ]}
          autoCapitalize="characters"
          value={confirmation}
          onChangeText={setConfirmation}
          editable={!isDeleting}
          placeholder="DELETE"
          placeholderTextColor={colors.textMuted}
        />

        <TouchableOpacity
          style={[
            styles.deleteButton,
            { backgroundColor: canDelete ? colors.error : colors.border },
          ]}
          onPress={handleDeleteAccount}
          disabled={!canDelete}
          activeOpacity={0.8}
        >
          {isDeleting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.deleteButtonText}>Delete My Account</Text>
          )}
        </TouchableOpacity>

        {isDeleting && progress ? (
          <Text style={[styles.progressText, { color: colors.textSecondary }]}>{progress}</Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 14,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  warningText: {
    fontSize: 14,
    lineHeight: 20,
  },
  label: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  deleteButton: {
    marginTop: 8,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  progressText: {
    marginTop: 8,
    fontSize: 13,
  },
});

