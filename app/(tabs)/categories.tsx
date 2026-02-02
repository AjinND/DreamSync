import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useBucketStore } from "../../src/store/useBucketStore";
import { colors, gradients } from "../../src/theme";
import { Category } from "../../src/types/item";

const CATEGORIES: { id: Category; label: string; icon: any; color: string; desc: string }[] = [
    { id: 'travel', label: 'Travel', icon: 'airplane', color: '#3B82F6', desc: 'Explore the world' },
    { id: 'skill', label: 'Skill', icon: 'school', color: '#8B5CF6', desc: 'Learn something new' },
    { id: 'adventure', label: 'Adventure', icon: 'compass', color: '#F59E0B', desc: 'Seek thrills' },
    { id: 'creative', label: 'Creative', icon: 'color-palette', color: '#EC4899', desc: 'Express yourself' },
    { id: 'career', label: 'Career', icon: 'briefcase', color: '#64748B', desc: 'Professional goals' },
    { id: 'health', label: 'Health', icon: 'fitness', color: '#EF4444', desc: 'Body & Mind' },
    { id: 'personal', label: 'Personal', icon: 'person', color: '#10B981', desc: 'Growth & Family' },
];

export default function CategoriesScreen() {
    const router = useRouter();
    const { items } = useBucketStore();

    // Calculate counts
    const getCount = (catId: string) => items.filter(i => i.category === catId).length;

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
                    <Text style={styles.title}>Categories</Text>
                    <Text style={styles.subtitle}>Browse your dreams by topic</Text>
                </View>

                <ScrollView contentContainerStyle={styles.grid}>
                    {CATEGORIES.map((cat) => (
                        <TouchableOpacity
                            key={cat.id}
                            style={styles.card}
                            onPress={() => router.push(`/category/${cat.id}`)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.iconContainer, { backgroundColor: cat.color + '15' }]}>
                                <Ionicons name={cat.icon} size={28} color={cat.color} />
                            </View>
                            <View style={styles.cardContent}>
                                <Text style={styles.count}>{getCount(cat.id)} items</Text>
                                <Text style={styles.cardTitle}>{cat.label}</Text>
                                <Text style={styles.cardDesc}>{cat.desc}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={colors.slate[300]} />
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.slate[50],
    },
    safeArea: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 24,
        paddingVertical: 16,
    },
    title: {
        fontSize: 32,
        fontWeight: "800",
        color: colors.slate[900],
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 14,
        color: colors.slate[500],
        marginTop: 4,
        fontWeight: "500",
    },
    grid: {
        padding: 24,
        gap: 16,
    },
    card: {
        backgroundColor: colors.white,
        borderRadius: 20,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: colors.indigo[900],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    cardContent: {
        flex: 1,
    },
    count: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.slate[400],
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.slate[900],
        marginBottom: 2,
    },
    cardDesc: {
        fontSize: 13,
        color: colors.slate[500],
    },
});
