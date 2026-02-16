import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { signOut } from 'firebase/auth';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth } from '../../firebaseConfig';
import { KeyManager } from '../../src/services/keyManager';
import { useTheme } from '../../src/theme';

export default function Reauth() {
    const { colors, isDark } = useTheme();
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleReauth = async () => {
        if (!password) return Alert.alert("Error", "Please enter your password.");

        const user = auth.currentUser;
        if (!user) {
            router.replace('/(auth)/login');
            return;
        }

        setLoading(true);
        try {
            await KeyManager.initializeKeysOnLogin(password, user.uid);
            router.replace('/(tabs)');
        } catch (e: any) {
            console.error('[Reauth] Key initialization failed:', e);
            const errorMessage = e.message?.includes('verification failed')
                ? 'Incorrect password. Please try again.'
                : 'Could not set up encryption. Please check your password and try again.\n\nError: ' + (e.message || 'Unknown error');

            Alert.alert("Re-authentication Failed", errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleSignOut = async () => {
        await KeyManager.clearKeys();
        await signOut(auth);
        router.replace('/(auth)/login');
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={isDark ? 'light' : 'dark'} />

            <View style={styles.header}>
                <View style={[styles.iconBox, { backgroundColor: colors.surface }]}>
                    <Text style={styles.iconText}>🔒</Text>
                </View>
                <Text style={[styles.titleText, { color: colors.textPrimary }]}>Encryption Setup</Text>
                <Text style={[styles.subtitleText, { color: colors.textSecondary }]}>
                    For security, re-enter your password to enable encryption on this device.
                </Text>
            </View>

            <View style={styles.form}>
                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                        placeholder="Enter your password"
                        placeholderTextColor={colors.textMuted}
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: colors.primary, shadowColor: colors.primary }, loading && styles.buttonDisabled]}
                    onPress={handleReauth}
                    disabled={loading}
                >
                    <Text style={[styles.buttonText, { color: colors.textInverse }]}>
                        {loading ? "Setting up encryption..." : "Continue"}
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.footer}>
                <TouchableOpacity onPress={handleSignOut}>
                    <Text style={[styles.linkText, { color: colors.textSecondary }]}>Sign out instead</Text>
                </TouchableOpacity>
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
    iconBox: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    iconText: {
        fontSize: 28,
    },
    titleText: {
        fontSize: 26,
        fontWeight: 'bold',
    },
    subtitleText: {
        fontSize: 15,
        marginTop: 8,
        textAlign: 'center',
        paddingHorizontal: 20,
        lineHeight: 22,
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
        alignItems: 'center',
        marginTop: 32,
    },
    linkText: {
        fontSize: 14,
    },
});
