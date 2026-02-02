import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimatedPressable } from "../../src/components/ui/AnimatedPressable";
import { useBucketStore } from "../../src/store/useBucketStore";
import { colors, gradients } from "../../src/theme";
import { Category } from "../../src/types/item";

const CATEGORY_LABELS: Record<string, string> = {
    travel: 'Travel',
    skill: 'Skill',
    adventure: 'Adventure',
    creative: 'Creative',
    career: 'Career',
    health: 'Health',
    personal: 'Personal',
};

export default function CategoryDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { items } = useBucketStore();

    const categoryId = id as Category;
    const categoryItems = items.filter(i => i.category === categoryId);
    const label = CATEGORY_LABELS[categoryId] || 'Category';

    const renderItem = ({ item }: { item: any }) => (
        <AnimatedPressable
            style={styles.card}
            onPress={() => router.push(`/item/${item.id}`)}
        >
            <View style={styles.cardContent}>
                <LinearGradient
                    colors={
                        (item.phase === "dream"
                            ? [colors.dream.light, colors.dream.default]
                            : item.phase === "doing"
                                ? [colors.doing.light, colors.doing.default]
                                : [colors.done.light, colors.done.default]) as any
                    }
                    style={styles.phaseIndicator}
                />
                <View style={styles.textContainer}>
                    <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                    <View style={[
                        styles.badge,
                        { backgroundColor: item.phase === 'dream' ? colors.dream.light + '40' : item.phase === 'doing' ? colors.doing.light + '40' : colors.done.light + '40' }
                    ]}>
                        <Text style={[
                            styles.badgeText,
                            { color: item.phase === 'dream' ? colors.dream.dark : item.phase === 'doing' ? colors.doing.dark : colors.done.dark }
                        ]}>
                            {item.phase.toUpperCase()}
                        </Text>
                    </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.slate[400]} />
            </View>
        </AnimatedPressable>
    );

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
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.slate[900]} />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.title}>{label}</Text>
                        <Text style={styles.subtitle}>{categoryItems.length} items</Text>
                    </View>
                </View>

                <FlatList
                    data={categoryItems}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    renderItem={renderItem}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="folder-open-outline" size={48} color={colors.indigo[200]} />
                            <Text style={styles.emptyText}>No items in this category yet.</Text>
                        </View>
                    }
                />
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.slate[50] },
    safeArea: { flex: 1 },
    header: { padding: 24, flexDirection: 'row', alignItems: 'center' },
    backButton: { marginRight: 16, padding: 8, marginLeft: -8 },
    title: { fontSize: 28, fontWeight: "800", color: colors.slate[900] },
    subtitle: { fontSize: 14, color: colors.slate[500] },
    listContent: { padding: 24, paddingTop: 0 },
    card: {
        backgroundColor: colors.white,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: colors.indigo[900],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardContent: { flexDirection: "row", alignItems: "center", padding: 16 },
    phaseIndicator: { width: 4, height: 40, borderRadius: 2, marginRight: 16 },
    textContainer: { flex: 1, marginRight: 12 },
    itemTitle: { fontSize: 16, fontWeight: "600", color: colors.slate[900], marginBottom: 6 },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
    badgeText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
    emptyState: { alignItems: "center", justifyContent: "center", marginTop: 64 },
    emptyText: { fontSize: 14, color: colors.slate[500], marginTop: 12 },
});
