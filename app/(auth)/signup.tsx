import { Link, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth } from '../../firebaseConfig';
import { KeyManager } from '../../src/services/keyManager';
import { safeValidate, signupSchema } from '../../src/services/validation';
import { useTheme } from '../../src/theme';

export default function Signup() {
    const { colors, isDark } = useTheme();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState('');
    const router = useRouter();

    const handleSignup = async () => {
        if (!email || !password) return Alert.alert("Error", "Please fill in all fields.");

        const validation = safeValidate(signupSchema, { email, password });
        if (!validation.success) {
            return Alert.alert("Validation Error", validation.error);
        }

        setLoading(true);
        try {
            setLoadingText('Creating account...');
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);

            setLoadingText('Securing your account...');
            await KeyManager.initializeKeysOnSignup(password, userCredential.user.uid);

            setLoadingText('Sending verification email...');
            await sendEmailVerification(userCredential.user);

            router.replace('/(auth)/verify-email' as any);
        } catch (e: any) {
            Alert.alert("Signup Failed", e.message);
        } finally {
            setLoading(false);
            setLoadingText('');
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={isDark ? 'light' : 'dark'} />

            <View style={styles.header}>
                <Text style={[styles.titleText, { color: colors.textPrimary }]}>Create Account</Text>
                <Text style={[styles.subtitleText, { color: colors.textSecondary }]}>Start your bucket list journey today</Text>
            </View>

            <View style={styles.form}>
                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                        placeholder="hello@example.com"
                        placeholderTextColor={colors.textMuted}
                        autoCapitalize="none"
                        value={email}
                        onChangeText={setEmail}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                        placeholder="••••••••"
                        placeholderTextColor={colors.textMuted}
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: colors.primary, shadowColor: colors.primary }, loading && styles.buttonDisabled]}
                    onPress={handleSignup}
                    disabled={loading}
                >
                    <Text style={[styles.buttonText, { color: colors.textInverse }]}>
                        {loading ? (loadingText || "Creating Account...") : "Sign Up"}
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.footer}>
                <Text style={[styles.footerText, { color: colors.textSecondary }]}>Already have an account? </Text>
                <Link href="/(auth)/login" asChild>
                    <TouchableOpacity>
                        <Text style={[styles.linkText, { color: colors.primary }]}>Sign In</Text>
                    </TouchableOpacity>
                </Link>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    titleText: {
        fontSize: 30,
        fontWeight: 'bold',
    },
    subtitleText: {
        fontSize: 16,
        marginTop: 8,
    },
    form: {
        gap: 16,
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 6,
        marginLeft: 4,
    },
    input: {
        borderWidth: 1,
        padding: 16,
        borderRadius: 12,
        fontSize: 16,
    },
    button: {
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 3,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 32,
    },
    footerText: {
        fontSize: 14,
    },
    linkText: {
        fontWeight: 'bold',
        fontSize: 14,
    },
});
