import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Compass, Globe, Lock, Mail, Settings, Sparkles } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, ImageBackground, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth } from '../../firebaseConfig';
import { KeyManager } from '../../src/services/keyManager';
import { loginSchema, safeValidate } from '../../src/services/validation';
import { createExponentialBackoffLimiter } from '../../src/utils/rateLimiter';

const loginLimiter = createExponentialBackoffLimiter(30_000, 5);
const BG_IMAGE_URL = 'https://lh3.googleusercontent.com/aida-public/AB6AXuD1SvoY7c4t-4YmOgCv636LlZaHYCSv_ZfDR77WWE2t9PWR5AlnelJzgtoEI4h1b7JGThvIpeSs83B_8FmTXmLx59aFtG9Gr7DEAgOzjem9slQPrHZNsfRGYyoyhaNGywBpWSZUE2KonCalV62VZlhmFAgoraympe42fkaRdnGKpXc2GOfU1OHlY0QetLl5oO1bJArf9akCUjuqMEDo0fCYOOK6SfJLhHaYgquYsv7wlAJht9SrtWLVb_Jj9dZZY7RQ9WvIikNgBqcG';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState('');
    const router = useRouter();

    const handleLogin = async () => {
        const gate = loginLimiter.canProceed('login');
        if (!gate.allowed) {
            const seconds = Math.ceil(gate.retryAfterMs / 1000);
            return Alert.alert("Too Many Attempts", `Please wait ${seconds}s before trying again.`);
        }

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
            loginLimiter.registerSuccess('login');

            router.replace('/(tabs)');
        } catch (e: any) {
            loginLimiter.registerFailure('login');
            Alert.alert("Login Failed", e.message);
        } finally {
            setLoading(false);
            setLoadingText('');
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            <ImageBackground
                source={{ uri: BG_IMAGE_URL }}
                style={[StyleSheet.absoluteFill, { transform: [{ scale: 1.1 }] }]}
                resizeMode="cover"
            />
            <LinearGradient colors={['rgba(15,8,20,0)', 'rgba(15,8,20,0.6)', '#0f0814']} style={StyleSheet.absoluteFill} />
            <LinearGradient colors={['rgba(140,37,244,0.1)', 'transparent', 'rgba(15,8,20,0.9)']} style={StyleSheet.absoluteFill} />

            {/* Subtle Particles placeholder */}
            <View style={[styles.particle, { top: '15%', left: '10%' }]} />
            <View style={[styles.particle, { top: '45%', left: '80%', opacity: 0.2 }]} />

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    <View style={styles.header}>
                        <View style={styles.iconBox}>
                            <Compass size={40} color="#8c25f4" strokeWidth={1.5} />
                        </View>
                        <Text style={styles.title}>Ascend.</Text>
                        <Text style={styles.subtitle}>The peak of your journey</Text>
                    </View>

                    <BlurView intensity={40} tint="dark" style={styles.glassCard}>
                        <View style={styles.form}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>EMAIL ADDRESS</Text>
                                <View style={styles.inputWrapper}>
                                    <Mail size={20} color="#64748b" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="your@journey.com"
                                        placeholderTextColor="#64748b"
                                        autoCapitalize="none"
                                        keyboardType="email-address"
                                        value={email}
                                        onChangeText={setEmail}
                                    />
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <View style={styles.passwordHeader}>
                                    <Text style={styles.label}>PASSWORD</Text>
                                    <TouchableOpacity>
                                        <Text style={styles.forgotText}>FORGOT?</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.inputWrapper}>
                                    <Lock size={20} color="#64748b" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="••••••••"
                                        placeholderTextColor="#64748b"
                                        secureTextEntry
                                        value={password}
                                        onChangeText={setPassword}
                                    />
                                </View>
                            </View>

                            <TouchableOpacity disabled={loading} onPress={handleLogin} activeOpacity={0.8}>
                                <LinearGradient
                                    colors={['#a855f7', '#8c25f4']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={[styles.loginBtn, loading && styles.disabledBtn]}
                                >
                                    <Text style={styles.loginBtnText}>
                                        {loading ? (loadingText || "Signing In...") : "Sign In"}
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>

                            <View style={styles.footerWrap}>
                                <Text style={styles.footerText}>New to the climb? </Text>
                                <Link href="/(auth)/signup" asChild>
                                    <TouchableOpacity>
                                        <Text style={styles.linkText}>Create Account</Text>
                                    </TouchableOpacity>
                                </Link>
                            </View>
                        </View>
                    </BlurView>

                    <View style={styles.socialBar}>
                        <TouchableOpacity style={styles.socialIcon}><Globe size={24} color="#64748b" /></TouchableOpacity>
                        <TouchableOpacity style={styles.socialIcon}><Sparkles size={24} color="#64748b" /></TouchableOpacity>
                        <TouchableOpacity style={styles.socialIcon}><Settings size={24} color="#64748b" /></TouchableOpacity>
                    </View>

                </ScrollView>
                <View style={styles.bottomBranding}>
                    <Text style={styles.brandingText}>THE PREMIUM EXPERIENCE • EST. 2026</Text>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f0814' },
    particle: { position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: 'white', opacity: 0.4 },
    keyboardView: { flex: 1 },
    scrollContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 40 },
    header: { alignItems: 'center', marginBottom: 40 },
    iconBox: { width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(140, 37, 244, 0.1)', borderWidth: 1, borderColor: 'rgba(140, 37, 244, 0.4)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
    title: { fontSize: 44, fontWeight: '900', color: '#ffffff', letterSpacing: -1.5, marginBottom: 8 },
    subtitle: { fontSize: 16, color: '#94a3b8', letterSpacing: 0.5 },
    glassCard: { width: '100%', maxWidth: 420, borderRadius: 24, overflow: 'hidden', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.15)' },
    form: { padding: 32 },
    inputGroup: { marginBottom: 24 },
    passwordHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    label: { fontSize: 11, fontWeight: '800', color: '#94a3b8', letterSpacing: 1.5, marginBottom: 8, marginLeft: 4 },
    forgotText: { fontSize: 11, fontWeight: '800', color: '#8c25f4', letterSpacing: 1.5, marginBottom: 8 },
    inputWrapper: { position: 'relative', justifyContent: 'center' },
    inputIcon: { position: 'absolute', left: 16, zIndex: 1 },
    input: { backgroundColor: 'rgba(15, 8, 20, 0.6)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 16, padding: 16, paddingLeft: 48, color: '#ffffff', fontSize: 16 },
    loginBtn: { paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginTop: 8, shadowColor: '#8c25f4', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 },
    disabledBtn: { opacity: 0.7 },
    loginBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
    footerWrap: { flexDirection: 'row', justifyContent: 'center', marginTop: 32, paddingTop: 24, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
    footerText: { color: '#94a3b8', fontSize: 14 },
    linkText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
    socialBar: { flexDirection: 'row', justifyContent: 'center', gap: 32, marginTop: 40 },
    socialIcon: { padding: 8 },
    bottomBranding: { position: 'absolute', bottom: 32, width: '100%', alignItems: 'center' },
    brandingText: { fontSize: 10, color: '#475569', letterSpacing: 3, fontWeight: '900' }
});
