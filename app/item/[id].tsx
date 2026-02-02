import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import {
    Alert,
    Animated,
    Dimensions,
    Image,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { useBucketStore } from "../../src/store/useBucketStore";
import { colors, gradients } from "../../src/theme";
import { Phase } from "../../src/types/item";

const { width } = Dimensions.get("window");
const HEAD_HEIGHT = 400;

export default function ItemDetail() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { items, updateItem, deleteItem } = useBucketStore();
    const [item, setItem] = useState(items.find((i) => i.id === id));

    const scrollY = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Sync local state with store items in case of updates
        const currentItem = items.find((i) => i.id === id);
        if (currentItem) {
            setItem(currentItem);
        }
    }, [items, id]);

    if (!item) {
        return (
            <View style={styles.loadingContainer}>
                <Text>Item not found</Text>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const handleDelete = () => {
        Alert.alert(
            "Delete Dream",
            "Are you sure you want to let this dream go?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        await deleteItem(id as string);
                        router.back();
                    },
                },
            ]
        );
    };

    const handlePhaseChange = async (newPhase: Phase) => {
        await updateItem(item.id, { phase: newPhase });
    };

    const headerTranslateY = scrollY.interpolate({
        inputRange: [0, HEAD_HEIGHT],
        outputRange: [0, -HEAD_HEIGHT / 3],
        extrapolate: "clamp",
    });

    const headerOpacity = scrollY.interpolate({
        inputRange: [0, HEAD_HEIGHT / 2],
        outputRange: [1, 0],
        extrapolate: "clamp",
    });

    const imageScale = scrollY.interpolate({
        inputRange: [-100, 0],
        outputRange: [1.2, 1],
        extrapolate: "clamp",
    });

    const currentColors =
        item.phase === "dream"
            ? colors.dream
            : item.phase === "doing"
                ? colors.doing
                : colors.done;

    const currentGradient =
        item.phase === "dream"
            ? gradients.dream
            : item.phase === "doing"
                ? gradients.doing
                : gradients.done;

    const showDreamButton = item.phase !== 'dream';
    const showDoingButton = item.phase !== 'doing';
    const showDoneButton = item.phase !== 'done';

    // Determine which visible button is the last one to remove right margin
    let lastVisibleButton = '';
    if (showDoneButton) lastVisibleButton = 'done';
    else if (showDoingButton) lastVisibleButton = 'doing';
    else if (showDreamButton) lastVisibleButton = 'dream';

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Animated Header Background */}
            <Animated.View
                style={[
                    styles.headerBackground,
                    {
                        height: HEAD_HEIGHT,
                        transform: [
                            { translateY: headerTranslateY },
                            { scale: imageScale }
                        ],
                    },
                ]}
            >
                {item.mainImage ? (
                    <Image
                        source={{ uri: item.mainImage }}
                        style={StyleSheet.absoluteFillObject}
                        resizeMode="cover"
                    />
                ) : (
                    <LinearGradient
                        colors={currentGradient.colors as any}
                        locations={currentGradient.locations as any}
                        style={StyleSheet.absoluteFillObject}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    />
                )}
                <LinearGradient
                    colors={["transparent", "rgba(0,0,0,0.8)"]}
                    style={StyleSheet.absoluteFillObject}
                />
            </Animated.View>

            {/* Navigation Bar */}
            <View style={styles.navBar}>
                <TouchableOpacity
                    style={styles.navButton}
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.navButton}
                    onPress={() => router.push({ pathname: '/item/add', params: { id: item.id } })}
                >
                    <Ionicons name="pencil-outline" size={24} color="white" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.navButton, { marginLeft: 12 }]} onPress={handleDelete}>
                    <Ionicons name="trash-outline" size={24} color="#EF4444" />
                </TouchableOpacity>
            </View>

            <Animated.ScrollView
                contentContainerStyle={styles.scrollContent}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: true }
                )}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.contentSpacer} />

                <View style={styles.cardContainer}>
                    {/* Phase Badge */}
                    <View style={[styles.phaseBadge, { backgroundColor: currentColors.default + '15', borderColor: currentColors.default }]}>
                        <Ionicons
                            name={item.phase === 'dream' ? 'moon' : item.phase === 'doing' ? 'flame' : 'trophy'}
                            size={14}
                            color={currentColors.default}
                            style={{ marginRight: 6 }}
                        />
                        <Text style={[styles.phaseText, { color: currentColors.default }]}>
                            {item.phase.toUpperCase()}
                        </Text>
                    </View>

                    <Text style={styles.title}>{item.title}</Text>

                    <View style={styles.metaRow}>
                        <View style={styles.metaItem}>
                            <Ionicons name="pricetag-outline" size={16} color={colors.slate[400]} />
                            <Text style={styles.metaText}>{item.category}</Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Ionicons name="calendar-outline" size={16} color={colors.slate[400]} />
                            <Text style={styles.metaText}>Created today</Text>
                        </View>
                    </View>

                    <Text style={styles.sectionTitle}>WHY THIS MATTERS</Text>
                    <Text style={styles.description}>
                        {item.description || "No description provided yet."}
                    </Text>

                    {/* Action Buttons */}
                    <Text style={styles.sectionTitle}>UPDATE STATUS</Text>
                    <View style={styles.actionsContainer}>
                        {showDreamButton && (
                            <TouchableOpacity
                                style={[
                                    styles.actionButton,
                                    lastVisibleButton === 'dream' && styles.actionButtonLast,
                                    { borderColor: colors.dream.default }
                                ]}
                                onPress={() => handlePhaseChange('dream')}
                            >
                                <Ionicons name="moon-outline" size={20} color={colors.dream.dark} />
                                <Text style={[styles.actionButtonText, { color: colors.dream.dark }]}>Dream</Text>
                            </TouchableOpacity>
                        )}

                        {showDoingButton && (
                            <TouchableOpacity
                                style={[
                                    styles.actionButton,
                                    lastVisibleButton === 'doing' && styles.actionButtonLast,
                                    { borderColor: colors.doing.default }
                                ]}
                                onPress={() => handlePhaseChange('doing')}
                            >
                                <Ionicons name="flame-outline" size={20} color={colors.doing.dark} />
                                <Text style={[styles.actionButtonText, { color: colors.doing.dark }]}>Action</Text>
                            </TouchableOpacity>
                        )}

                        {showDoneButton && (
                            <TouchableOpacity
                                style={[
                                    styles.actionButton,
                                    lastVisibleButton === 'done' && styles.actionButtonLast,
                                    { borderColor: colors.done.default }
                                ]}
                                onPress={() => handlePhaseChange('done')}
                            >
                                <Ionicons name="trophy-outline" size={20} color={colors.done.dark} />
                                <Text style={[styles.actionButtonText, { color: colors.done.dark }]}>Achieved</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                </View>
            </Animated.ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.slate[50], // Darker background for contrast behind card
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    backButtonText: {
        color: colors.indigo[600],
        marginTop: 10,
    },
    headerBackground: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        width: width,
        zIndex: 1,
    },
    navBar: {
        position: "absolute",
        top: Platform.OS === 'ios' ? 50 : 30,
        left: 0,
        right: 0,
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        zIndex: 100,
    },
    navButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "rgba(0,0,0,0.3)",
        alignItems: "center",
        justifyContent: "center",
    },
    scrollContent: {
        paddingBottom: 40,
    },
    contentSpacer: {
        height: HEAD_HEIGHT - 60,
    },
    cardContainer: {
        backgroundColor: colors.white,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 32,
        minHeight: 500,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    phaseBadge: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 16,
    },
    phaseText: {
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: 0.5,
    },
    title: {
        fontSize: 32,
        fontWeight: "800",
        color: colors.slate[900],
        marginBottom: 16,
        lineHeight: 40,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 32,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 24,
    },
    metaText: {
        marginLeft: 6,
        color: colors.slate[500],
        fontSize: 14,
        fontWeight: '500',
        textTransform: 'capitalize',
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: "800",
        color: colors.slate[400],
        letterSpacing: 1,
        marginBottom: 12,
        marginTop: 8,
    },
    description: {
        fontSize: 17,
        lineHeight: 28,
        color: colors.slate[700],
        marginBottom: 40,
    },
    actionsContainer: {
        flexDirection: 'row',
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 16,
        borderWidth: 1,
        backgroundColor: colors.white,
        marginRight: 10,
    },
    actionButtonLast: {
        marginRight: 0,
    },
    actionButtonText: {
        fontSize: 14,
        fontWeight: "700",
        marginLeft: 8,
    },
});
