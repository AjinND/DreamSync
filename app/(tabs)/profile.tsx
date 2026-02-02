import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Alert, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth } from "../../firebaseConfig";
import { useBucketStore } from "../../src/store/useBucketStore";
import { colors, gradients } from "../../src/theme";

export default function ProfileScreen() {
    const router = useRouter();
    const { items } = useBucketStore();
    const user = auth.currentUser;

    const handleSignOut = async () => {
        try {
            await auth.signOut();
            // Layout will handle redirect
        } catch (error: any) {
            Alert.alert("Error", error.message);
        }
    };

    const stats = [
        { label: 'Total Dreams', value: items.length, icon: 'list' },
        { label: 'Completed', value: items.filter(i => i.phase === 'done').length, icon: 'trophy' },
        { label: 'Active', value: items.filter(i => i.phase === 'doing').length, icon: 'flame' },
    ];

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <LinearGradient
                colors={gradients.background.colors as any}
                locations={gradients.background.locations as any}
                style={StyleSheet.absoluteFillObject}
            />

            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <Text style={styles.title}>Account</Text>
                </View>

                <View style={styles.content}>
                    {/* User Card */}
                    <View style={styles.userCard}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{user?.email?.[0]?.toUpperCase() || 'U'}</Text>
                        </View>
                        <View style={styles.userInfo}>
                            <Text style={styles.email} numberOfLines={1}>{user?.email || 'Guest'}</Text>
                            <Text style={styles.uid} numberOfLines={1}>ID: {user?.uid.slice(0, 8)}...</Text>
                        </View>
                    </View>

                    {/* Stats Row */}
                    <View style={styles.statsRow}>
                        {stats.map((s, i) => (
                            <View key={i} style={styles.statItem}>
                                <View style={styles.statIcon}>
                                    <Ionicons name={s.icon as any} size={20} color={colors.indigo[500]} />
                                </View>
                                <Text style={styles.statValue}>{s.value}</Text>
                                <Text style={styles.statLabel}>{s.label}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Settings Sections */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>PREFERENCES</Text>
                        <View style={styles.settingItem}>
                            <View style={styles.settingLeft}>
                                <Ionicons name="moon-outline" size={22} color={colors.slate[600]} />
                                <Text style={styles.settingText}>Dark Mode</Text>
                            </View>
                            <Switch value={false} trackColor={{ true: colors.indigo[500] }} />
                        </View>
                        <View style={styles.settingItem}>
                            <View style={styles.settingLeft}>
                                <Ionicons name="notifications-outline" size={22} color={colors.slate[600]} />
                                <Text style={styles.settingText}>Notifications</Text>
                            </View>
                            <Switch value={true} trackColor={{ true: colors.indigo[500] }} />
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>ACCOUNT</Text>
                        <TouchableOpacity style={styles.settingItem} onPress={handleSignOut}>
                            <View style={styles.settingLeft}>
                                <Ionicons name="log-out-outline" size={22} color="#EF4444" />
                                <Text style={[styles.settingText, { color: '#EF4444' }]}>Sign Out</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={colors.slate[300]} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.settingItem}>
                            <View style={styles.settingLeft}>
                                <Ionicons name="trash-outline" size={22} color={colors.slate[400]} />
                                <Text style={[styles.settingText, { color: colors.slate[400] }]}>Delete Data</Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.slate[50] },
    safeArea: { flex: 1 },
    header: { padding: 24, paddingBottom: 16 },
    title: { fontSize: 32, fontWeight: "800", color: colors.slate[900], letterSpacing: -0.5 },
    content: { padding: 24, paddingTop: 0 },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        padding: 20,
        borderRadius: 20,
        marginBottom: 24,
        shadowColor: colors.indigo[900],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: colors.indigo[100],
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    avatarText: { fontSize: 24, fontWeight: '700', color: colors.indigo[600] },
    userInfo: { flex: 1 },
    email: { fontSize: 16, fontWeight: '700', color: colors.slate[900], marginBottom: 4 },
    uid: { fontSize: 12, color: colors.slate[400] },
    statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
    statItem: {
        flex: 1,
        backgroundColor: colors.white,
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        marginHorizontal: 4,
        shadowColor: colors.indigo[900],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    statIcon: { marginBottom: 8, padding: 8, backgroundColor: colors.indigo[50], borderRadius: 12 },
    statValue: { fontSize: 18, fontWeight: '800', color: colors.slate[900], marginBottom: 2 },
    statLabel: { fontSize: 10, fontWeight: '600', color: colors.slate[400], textTransform: 'uppercase' },
    section: { marginBottom: 32 },
    sectionTitle: { fontSize: 12, fontWeight: '700', color: colors.slate[400], marginBottom: 16, letterSpacing: 1 },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.white,
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
    },
    settingLeft: { flexDirection: 'row', alignItems: 'center' },
    settingText: { fontSize: 16, fontWeight: '600', color: colors.slate[700], marginLeft: 12 },
});
