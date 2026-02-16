import { Link, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth } from '../../firebaseConfig';
import { KeyManager } from '../../src/services/keyManager';
import { safeValidate, loginSchema } from '../../src/services/validation';
import { useTheme } from '../../src/theme';

export default function Login() {
    const { colors, isDark } = useTheme();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState('');
    const router = useRouter();

    const handleLogin = async () => {
        if (!email || !password) return Alert.alert("Error", "Please fill in all fields.");

        const validation = safeValidate(loginSchema, { email, password });
        if (!validation.success) {
            return Alert.alert("Validation Error", validation.error);
        }

        setLoading(true);
        try {
            setLoadingText('Signing in...');
            const userCredential = await signInWithEmailAndPassword(auth, email, password);

            setLoadingText('Setting up encryption...');
            await KeyManager.initializeKeysOnLogin(password, userCredential.user.uid);

            router.replace('/(tabs)');
        } catch (e: any) {
            Alert.alert("Login Failed", e.message);
        } finally {
            setLoading(false);
            setLoadingText('');
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={isDark ? 'light' : 'dark'} />

            <View style={styles.header}>
                <View style={[styles.logoBox, { backgroundColor: colors.primary, shadowColor: colors.primary }]}>
                    <Text style={[styles.logoText, { color: colors.textInverse }]}>L</Text>
                </View>
                <Text style={[styles.welcomeText, { color: colors.textPrimary }]}>Welcome Back</Text>
                <Text style={[styles.subtitleText, { color: colors.textSecondary }]}>Sign in to continue your journey</Text>
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
                    onPress={handleLogin}
                    disabled={loading}
                >
                    <Text style={[styles.buttonText, { color: colors.textInverse }]}>
                        {loading ? (loadingText || "Signing In...") : "Sign In"}
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.footer}>
                <Text style={[styles.footerText, { color: colors.textSecondary }]}>Don&apos;t have an account? </Text>
                <Link href="/(auth)/signup" asChild>
                    <TouchableOpacity>
                        <Text style={[styles.linkText, { color: colors.primary }]}>Sign Up</Text>
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
    logoBox: {
        width: 64,
        height: 64,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    logoText: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    welcomeText: {
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
