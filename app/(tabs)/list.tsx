import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import {
    Animated,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimatedPressable } from "../../src/components/ui/AnimatedPressable";
import { Skeleton } from "../../src/components/ui/Skeleton";
import { useBucketStore } from "../../src/store/useBucketStore";
import { colors, gradients } from "../../src/theme";

export default function ListScreen() {
    const router = useRouter();
    const { items, fetchItems, loading } = useBucketStore();
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        fetchItems();
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
        }).start();
    }, []);

    const renderSkeleton = () => (
        <View style={styles.card}>
            <View style={styles.cardContent}>
                <Skeleton width={4} height={40} style={{ marginRight: 16 }} />
                <View style={{ flex: 1 }}>
                    <Skeleton width="70%" height={20} style={{ marginBottom: 12 }} />
                    <Skeleton width="30%" height={16} />
                </View>
            </View>
        </View>
    );

    if (loading && items.length === 0) {
        return (
            <View style={styles.container}>
                <StatusBar style="dark" />
                <LinearGradient
                    colors={gradients.background.colors as any}
                    locations={gradients.background.locations as any}
                    style={StyleSheet.absoluteFillObject}
                />
                <SafeAreaView style={styles.safeArea}>
                    <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
                        <Skeleton width={200} height={40} style={{ marginBottom: 8 }} />
                        <Skeleton width={150} height={20} />
                    </Animated.View>
                    <View style={styles.listContent}>
                        {[1, 2, 3, 4, 5].map(i => (
                            <View key={i} style={{ marginBottom: 12 }}>{renderSkeleton()}</View>
                        ))}
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    const renderItem = ({ item, index }: { item: any; index: number }) => {
        // Staggered entrance animation for list items
        const translateY = new Animated.Value(50);
        const opacity = new Animated.Value(0);

        Animated.parallel([
            Animated.timing(translateY, {
                toValue: 0,
                duration: 400,
                delay: index * 50,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 1,
                duration: 400,
                delay: index * 50,
                useNativeDriver: true,
            }),
        ]).start();

        return (
            <Animated.View style={{ opacity, transform: [{ translateY }] }}>
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
                            <Text style={styles.itemTitle} numberOfLines={1}>
                                {item.title}
                            </Text>
                            <View style={styles.badgesContainer}>
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
                                <Text style={styles.categoryText}>{item.category}</Text>
                            </View>
                        </View>

                        <Ionicons
                            name="chevron-forward"
                            size={20}
                            color={colors.slate[400]}
                        />
                    </View>
                </AnimatedPressable>
            </Animated.View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <LinearGradient
                colors={gradients.background.colors as any}
                locations={gradients.background.locations as any}
                style={StyleSheet.absoluteFillObject}
            />

            <SafeAreaView style={styles.safeArea}>
                <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
                    <Text style={styles.title}>All Dreams</Text>
                    <Text style={styles.subtitle}>{items.length} items on your list</Text>
                </Animated.View>

                <FlatList
                    data={items}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={loading}
                            onRefresh={fetchItems}
                            tintColor={colors.indigo[600]}
                            colors={[colors.indigo[600]]}
                        />
                    }
                    renderItem={renderItem}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIconContainer}>
                                <Ionicons
                                    name="list-outline"
                                    size={48}
                                    color={colors.indigo[200]}
                                />
                            </View>
                            <Text style={styles.emptyTitle}>Your list is empty</Text>
                            <Text style={styles.emptyText}>
                                Time to add your first dream!
                            </Text>
                        </View>
                    }
                />
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
    listContent: {
        paddingHorizontal: 24,
        paddingBottom: 24,
    },
    card: {
        backgroundColor: colors.white,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: colors.indigo[900],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        overflow: "hidden",
    },
    cardContent: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
    },
    phaseIndicator: {
        width: 4,
        height: 40,
        borderRadius: 2,
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
        marginRight: 12,
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.slate[900],
        marginBottom: 6,
    },
    badgesContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginRight: 8,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: "700",
        letterSpacing: 0.5,
    },
    categoryText: {
        fontSize: 12,
        color: colors.slate[500],
        textTransform: "capitalize",
    },
    emptyState: {
        alignItems: "center",
        justifyContent: "center",
        marginTop: 64,
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.white,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
        shadowColor: colors.indigo[200],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: colors.slate[900],
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: colors.slate[500],
    },
});
