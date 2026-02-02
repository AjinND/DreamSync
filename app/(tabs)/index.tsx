import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useBucketStore } from "../../src/store/useBucketStore";
import { legacyColors as colors, legacyGradients as gradients } from "../../src/theme";

export default function HomeScreen() {
  const router = useRouter();
  const { items, fetchItems, loading } = useBucketStore();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const fabScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.5)).current;
  const headerSlide = useRef(new Animated.Value(-50)).current;
  const statsSlide = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    fetchItems();

    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(headerSlide, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(statsSlide, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous FAB pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(fabScale, {
          toValue: 1.08,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(fabScale, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Continuous glow
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 0.8,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.5,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleAddItem = () => {
    router.push("/item/add");
  };

  const recentItems = items.slice(0, 3);
  const totalDreams = items.length;
  const completed = items.filter((i) => i.phase === "done").length;
  const active = items.filter((i) => i.phase === "doing").length;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Animated Background Gradient */}
      <LinearGradient
        colors={gradients.background.colors as any}
        locations={gradients.background.locations as any}
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: headerSlide }],
            },
          ]}
        >
          <View>
            <Text style={styles.welcomeText}>Welcome Back</Text>
            <Text style={styles.titleText}>Your Journey</Text>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons
              name="notifications-outline"
              size={24}
              color={colors.indigo[900]}
            />
          </TouchableOpacity>
        </Animated.View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Stats Cards */}
          <Animated.View
            style={[
              styles.statsContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: statsSlide }],
              },
            ]}
          >
            <View style={styles.statCardWrapper}>
              <LinearGradient
                colors={gradients.dream.colors as any}
                locations={gradients.dream.locations as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statCardGradient}
              >
                <View style={styles.statCardContent}>
                  <Text style={styles.statLabelLight}>TOTAL DREAMS</Text>
                  <Text style={styles.statValueLight}>{totalDreams}</Text>
                  <View style={styles.sparkleContainer}>
                    <Ionicons name="sparkles" size={20} color="rgba(255,255,255,0.3)" />
                  </View>
                </View>
              </LinearGradient>
            </View>

            <View style={styles.miniStatsContainer}>
              <View style={[styles.miniStatCard, styles.miniStatCardFirst]}>
                <Text style={styles.miniStatLabel}>COMPLETED</Text>
                <Text style={styles.miniStatValue}>{completed}</Text>
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={colors.done.default}
                  style={styles.miniStatIcon}
                />
              </View>

              <View style={styles.miniStatCard}>
                <Text style={styles.miniStatLabel}>ACTIVE</Text>
                <Text style={styles.miniStatValue}>{active}</Text>
                <Ionicons
                  name="flame"
                  size={16}
                  color={colors.doing.default}
                  style={styles.miniStatIcon}
                />
              </View>
            </View>
          </Animated.View>

          {/* Hero Card */}
          <Animated.View style={{ opacity: fadeAnim }}>
            <View style={styles.heroCard}>
              <LinearGradient
                colors={[colors.indigo[50], colors.white] as any}
                style={styles.heroGradient}
              >
                <View style={styles.heroContent}>
                  <Text style={styles.heroTitle}>
                    {active > 0
                      ? `${active} Journey${active > 1 ? 's' : ''} in Progress`
                      : "Begin Your First Journey"}
                  </Text>
                  <Text style={styles.heroSubtitle}>
                    {active > 0
                      ? "Keep the momentum going! 🚀"
                      : "Transform your dreams into reality"}
                  </Text>
                  <TouchableOpacity
                    style={styles.heroButton}
                    onPress={handleAddItem}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={[colors.indigo[600], colors.indigo[700]] as any}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.heroButtonGradient}
                    >
                      <Ionicons name="add-circle" size={24} color="white" style={styles.heroButtonIcon} />
                      <Text style={styles.heroButtonText}>Add New Dream</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>
          </Animated.View>

          {/* Recent Activity */}
          <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            {loading ? (
              <ActivityIndicator
                size="large"
                color={colors.indigo[600]}
                style={{ marginTop: 20 }}
              />
            ) : recentItems.length > 0 ? (
              recentItems.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.activityCard}
                  onPress={() => router.push(`/item/${item.id}`)}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={
                      (item.phase === "dream"
                        ? [colors.dream.light, colors.dream.glow]
                        : item.phase === "doing"
                          ? [colors.doing.light, colors.doing.energy]
                          : [colors.done.light, colors.done.celebration]) as any
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.phaseBadgeGradient}
                  >
                    <Text style={styles.phaseBadgeText}>
                      {item.phase.toUpperCase()}
                    </Text>
                  </LinearGradient>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.activityCategory}>
                      {item.category}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={colors.slate[400]}
                  />
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconContainer}>
                  <Ionicons
                    name="sparkles-outline"
                    size={64}
                    color={colors.indigo[200]}
                  />
                </View>
                <Text style={styles.emptyStateText}>No dreams yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Start by adding your first dream!
                </Text>
              </View>
            )}
          </Animated.View>
        </ScrollView>

        {/* Floating Action Button with Glow */}
        <View style={styles.fabContainer}>
          {/* Glow Effect */}
          <Animated.View
            style={[
              styles.fabGlow,
              {
                opacity: glowOpacity,
              },
            ]}
          />

          {/* FAB */}
          <Animated.View
            style={{
              transform: [{ scale: fabScale }],
            }}
          >
            <TouchableOpacity
              style={styles.fab}
              onPress={handleAddItem}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[colors.indigo[500], colors.indigo[700]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.fabGradient}
              >
                <Ionicons name="add" size={32} color="white" />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  welcomeText: {
    fontSize: 14,
    color: colors.indigo[600],
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  titleText: {
    fontSize: 32,
    color: colors.indigo[900],
    fontWeight: "bold",
    marginTop: 4,
    letterSpacing: -0.5,
  },
  notificationButton: {
    backgroundColor: "rgba(255,255,255,0.9)",
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.indigo[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  statsContainer: {
    marginBottom: 24,
  },
  statCardWrapper: {
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 12,
  },
  statCardGradient: {
    borderRadius: 24,
  },
  statCardContent: {
    padding: 24,
    position: "relative",
  },
  statLabelLight: {
    fontSize: 11,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  statValueLight: {
    fontSize: 48,
    color: colors.white,
    fontWeight: "bold",
    marginTop: 8,
    letterSpacing: -1,
  },
  sparkleContainer: {
    position: "absolute",
    right: 24,
    top: 24,
  },
  miniStatsContainer: {
    flexDirection: "row",
  },
  miniStatCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 16,
    padding: 16,
    marginLeft: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  miniStatCardFirst: {
    marginLeft: 0,
  },
  miniStatLabel: {
    fontSize: 10,
    color: colors.slate[500],
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  miniStatValue: {
    fontSize: 28,
    color: colors.slate[900],
    fontWeight: "bold",
    marginTop: 4,
    marginBottom: 8,
  },
  miniStatIcon: {
    position: "absolute",
    right: 12,
    top: 12,
  },
  heroCard: {
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 32,
    shadowColor: colors.indigo[600],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 5,
  },
  heroGradient: {
    borderRadius: 24,
  },
  heroContent: {
    padding: 28,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.indigo[900],
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 15,
    color: colors.indigo[600],
    marginBottom: 24,
    lineHeight: 22,
  },
  heroButton: {
    borderRadius: 16,
    overflow: "hidden",
  },
  heroButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  heroButtonIcon: {
    marginRight: 12,
  },
  heroButtonText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.indigo[900],
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  activityCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  phaseBadgeGradient: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginRight: 12,
  },
  phaseBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.white,
    letterSpacing: 0.5,
  },
  activityContent: {
    flex: 1,
    marginRight: 12,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.slate[900],
    marginBottom: 4,
  },
  activityCategory: {
    fontSize: 13,
    color: colors.slate[500],
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.8)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: colors.indigo[200],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.indigo[700],
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.indigo[400],
    marginTop: 6,
  },
  fabContainer: {
    position: "absolute",
    right: 24,
    bottom: Platform.OS === "ios" ? 32 : 24,
    alignItems: "center",
    justifyContent: "center",
  },
  fabGlow: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.indigo[400],
    ...Platform.select({
      ios: {
        shadowColor: colors.indigo[500],
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 20,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: "hidden",
    shadowColor: colors.indigo[700],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  fabGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
