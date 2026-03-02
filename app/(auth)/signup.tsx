import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { ArrowRight, Compass, Eye, EyeOff, Lock, Mail, ShieldCheck, User } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, ImageBackground, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth } from '../../firebaseConfig';
import { KeyManager } from '../../src/services/keyManager';
import { safeValidate, signupSchema } from '../../src/services/validation';

const BG_IMAGE_URL = 'https://lh3.googleusercontent.com/aida-public/AB6AXuCmbbbsAXt3y0t3do7tKyOvD5D3XwciaxfINoUoHrFmo_amgL2sQR56ybhx1lsn4-JwcUYhQ0hIa-cppxZM0fnVP2Dc5c5RTELBRz4c-FN94CwOuMJwh79Eqvtkm2jnYA4RR2MhJmObFWIxbICdROU9N9BnrY7vUH3APijDl5ePL8ONLosF7Nx_g6RV7EK4BHXrZ9HdbMSIi7EDmhFo-cJ31YIsIyocqnsLrpV9Lbov1pCPnIe65xycXR7ei0dvYsHYFbR5B2iX6FWh';

export default function Signup() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const router = useRouter();

    const handleSignup = async () => {
        if (!name || !email || !password || !confirmPassword) {
            return Alert.alert("Error", "Please fill in all fields.");
        }

        if (password !== confirmPassword) {
            return Alert.alert("Error", "Passwords do not match.");
        }

        const validation = safeValidate(signupSchema, { email, password });
        if (!validation.success) {
            return Alert.alert("Validation Error", validation.error);
        }

        setLoading(true);
        try {
            setLoadingText('Creating account...');
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);

            if (userCredential.user) {
                await updateProfile(userCredential.user, { displayName: name });
            }

            setLoadingText('Securing your account...');
            await KeyManager.initializeKeysOnSignup(password, userCredential.user.uid);
            router.replace('/(auth)/verify-email' as any);
        } catch (e: any) {
            Alert.alert("Signup Failed", e.message);
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
            <LinearGradient colors={['transparent', 'rgba(15,8,20,0.8)', '#0f0814']} style={StyleSheet.absoluteFill} />

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    <View style={styles.header}>
                        <View style={styles.iconBox}>
                            <Compass size={36} color="#ffffff" strokeWidth={1.5} />
                        </View>
                        <Text style={styles.title}>Join the Journey</Text>
                        <Text style={styles.subtitle}>Craft your premium bucket list today.</Text>
                    </View>

                    <BlurView intensity={70} tint="dark" style={styles.glassCard}>
                        <View style={styles.form}>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Full Name</Text>
                                <View style={styles.inputWrapper}>
                                    <User size={20} color="#8c25f4" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Alex Rivers"
                                        placeholderTextColor="#64748b"
                                        value={name}
                                        onChangeText={setName}
                                    />
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Email Address</Text>
                                <View style={styles.inputWrapper}>
                                    <Mail size={20} color="#8c25f4" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="alex@adventure.com"
                                        placeholderTextColor="#64748b"
                                        autoCapitalize="none"
                                        keyboardType="email-address"
                                        value={email}
                                        onChangeText={setEmail}
                                    />
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Password</Text>
                                <View style={styles.inputWrapper}>
                                    <Lock size={20} color="#8c25f4" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="••••••••"
                                        placeholderTextColor="#64748b"
                                        secureTextEntry={!showPassword}
                                        value={password}
                                        onChangeText={setPassword}
                                    />
                                    <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
                                        {showPassword ? <EyeOff size={20} color="#64748b" /> : <Eye size={20} color="#64748b" />}
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Confirm Password</Text>
                                <View style={styles.inputWrapper}>
                                    <ShieldCheck size={20} color="#8c25f4" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="••••••••"
                                        placeholderTextColor="#64748b"
                                        secureTextEntry={!showPassword}
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                    />
                                </View>
                            </View>

                            <TouchableOpacity disabled={loading} onPress={handleSignup} activeOpacity={0.8} style={styles.submitBtnWrapper}>
                                <View style={[styles.submitBtn, loading && styles.disabledBtn]}>
                                    <Text style={styles.submitBtnText}>
                                        {loading ? (loadingText || "Creating...") : "Create Account"}
                                    </Text>
                                    {!loading && <ArrowRight size={20} color="#ffffff" />}
                                </View>
                            </TouchableOpacity>

                        </View>
                    </BlurView>

                    <View style={styles.footerWrap}>
                        <Text style={styles.footerText}>Already have an account? </Text>
                        <Link href="/(auth)/login" asChild>
                            <TouchableOpacity>
                                <Text style={styles.linkText}>Login</Text>
                            </TouchableOpacity>
                        </Link>
                    </View>

                </ScrollView>
                <View style={styles.bottomBar} />
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f0814' },
    keyboardView: { flex: 1 },
    scrollContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 40 },
    header: { alignItems: 'center', marginBottom: 32 },
    iconBox: { width: 64, height: 64, borderRadius: 16, backgroundColor: '#8c25f4', alignItems: 'center', justifyContent: 'center', marginBottom: 24, shadowColor: '#8c25f4', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 },
    title: { fontSize: 32, fontWeight: '800', color: '#ffffff', letterSpacing: -0.5, marginBottom: 8 },
    subtitle: { fontSize: 16, color: '#e2e8f0', fontWeight: '300' },
    glassCard: { width: '100%', maxWidth: 420, borderRadius: 24, overflow: 'hidden', backgroundColor: 'rgba(15, 8, 20, 0.4)', borderWidth: 1, borderColor: 'rgba(140, 37, 244, 0.3)' },
    form: { padding: 24 },
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 13, fontWeight: '600', color: '#cbd5e1', marginBottom: 6, marginLeft: 4 },
    inputWrapper: { position: 'relative', justifyContent: 'center' },
    inputIcon: { position: 'absolute', left: 16, zIndex: 1 },
    eyeIcon: { position: 'absolute', right: 16, zIndex: 1, padding: 4 },
    input: { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderWidth: 1, borderColor: 'rgba(140, 37, 244, 0.3)', borderRadius: 12, padding: 16, paddingLeft: 48, color: '#ffffff', fontSize: 16 },
    submitBtnWrapper: { marginTop: 24, shadowColor: '#8c25f4', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
    submitBtn: { backgroundColor: '#8c25f4', paddingVertical: 18, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    disabledBtn: { opacity: 0.7 },
    submitBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
    footerWrap: { flexDirection: 'row', justifyContent: 'center', marginTop: 32 },
    footerText: { color: '#94a3b8', fontSize: 15 },
    linkText: { color: '#8c25f4', fontSize: 15, fontWeight: '700', textDecorationLine: 'underline' },
    bottomBar: { position: 'absolute', bottom: 10, alignSelf: 'center', width: 120, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2 }
});
