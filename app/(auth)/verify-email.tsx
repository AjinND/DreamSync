import { auth } from '@/firebaseConfig';
import { useTheme } from '@/src/theme';
import { useRouter } from 'expo-router';
import { sendEmailVerification } from 'firebase/auth';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function VerifyEmailScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [isSending, setIsSending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const handleResend = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      setIsSending(true);
      await sendEmailVerification(user);
      Alert.alert('Verification Sent', 'Check your inbox for the verification link.');
    } catch (error: any) {
      Alert.alert('Failed', error?.message || 'Could not resend verification email.');
    } finally {
      setIsSending(false);
    }
  };

  const handleIVerified = async () => {
    const user = auth.currentUser;
    if (!user) {
      router.replace('/(auth)/login');
      return;
    }

    try {
      setIsChecking(true);
      await user.reload();

      if (auth.currentUser?.emailVerified) {
        router.replace('/(tabs)');
      } else {
        Alert.alert('Not verified yet', 'Please open the verification link from your email first.');
      }
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Verify your email</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Verification is optional. You can verify now, or skip and continue using the app.
      </Text>

      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: colors.primary }, isChecking && styles.disabled]}
        onPress={handleIVerified}
        disabled={isChecking}
      >
        <Text style={styles.primaryBtnText}>{isChecking ? 'Checking...' : 'I Verified My Email'}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.secondaryBtn, { borderColor: colors.border }, isSending && styles.disabled]}
        onPress={handleResend}
        disabled={isSending}
      >
        <Text style={[styles.secondaryBtnText, { color: colors.textPrimary }]}>
          {isSending ? 'Sending...' : 'Resend Email'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.skipBtn, { borderColor: colors.border }]}
        onPress={() => router.replace('/(tabs)')}
      >
        <Text style={[styles.skipBtnText, { color: colors.textSecondary }]}>Skip for now</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 28,
  },
  primaryBtn: {
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 14,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    marginTop: 12,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 14,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  skipBtn: {
    marginTop: 10,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
    borderWidth: 1,
  },
  skipBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.7,
  },
});
