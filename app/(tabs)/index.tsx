/**
 * DreamSync - Home Tab
 * Displays user's dreams with filtering, search, and premium DreamCard UI
 */

import { DreamCard, DreamCardSkeletonList } from '@/src/components/dream';
import { EmptyState, FilterChips, NotificationBell, SearchBar } from '@/src/components/shared';
import { GlassCard } from '@/src/components/ui';
import { UsersService } from '@/src/services/users';
import { useBucketStore } from '@/src/store/useBucketStore';
import { useTheme } from '@/src/theme';
import { UserProfile } from '@/src/types/social';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Moon, Plus, Trash2 } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Swipeable as SwipeableType } from 'react-native-gesture-handler';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

type Status = 'all' | 'dream' | 'doing' | 'done';

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'dream', label: 'Dreams' },
  { value: 'doing', label: 'In Progress' },
  { value: 'done', label: 'Completed' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const {
    items,
    filteredItems,
    fetchItems,
    fetchMore,
    loading,
    hasMore,
    isFetchingMore,
    searchItems,
    searchQuery,
    deleteItem,
  } = useBucketStore();

  const [selectedFilter, setSelectedFilter] = useState<Status>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const hasLoadedRef = useRef(false);
  const swipeableRefs = useRef<Record<string, SwipeableType | null>>({});

  useEffect(() => {
    fetchItems().finally(() => {
      hasLoadedRef.current = true;
    });
    UsersService.ensureUserProfile()
      .then(setUser)
      .catch(err => console.error('Failed to load user profile:', err));
  }, [fetchItems]);

  // Refresh data when tab regains focus (avoids stale data when navigating back)
  useFocusEffect(
    useCallback(() => {
      // Only refresh after initial load has completed.
      if (hasLoadedRef.current) {
        fetchItems();
      }
    }, [fetchItems])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchItems();
    setRefreshing(false);
  };

  const handleAddDream = () => {
    router.push('/item/add');
  };

  const handleDreamPress = (dreamId: string) => {
    router.push(`/item/${dreamId}`);
  };

  const handleDeleteDream = useCallback((dreamId: string, title: string) => {
    Alert.alert(
      'Delete Dream',
      `Delete "${title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingId(dreamId);
              await deleteItem(dreamId);
            } catch {
              Alert.alert('Error', 'Failed to delete this dream. Please try again.');
            } finally {
              setDeletingId((current) => (current === dreamId ? null : current));
            }
          },
        },
      ]
    );
  }, [deleteItem]);

  const renderSwipeDeleteAction = useCallback((dreamId: string, title: string) => (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[styles.deleteAction, { backgroundColor: colors.error }]}
      onPress={() => {
        swipeableRefs.current[dreamId]?.close();
        handleDeleteDream(dreamId, title);
      }}
      disabled={deletingId === dreamId}
    >
      <Trash2 size={18} color="#FFFFFF" />
      <Text style={styles.deleteActionText}>
        {deletingId === dreamId ? 'Deleting...' : 'Delete'}
      </Text>
    </TouchableOpacity>
  ), [colors.error, deletingId, handleDeleteDream]);

  // Filter items
  const phaseFilteredItems = filteredItems.filter((item) => {
    if (selectedFilter === 'all') return true;
    return item.phase === selectedFilter;
  });

  // Stats
  const totalCount = items.length;
  const dreamCount = items.filter(i => i.phase === 'dream').length;
  const doingCount = items.filter(i => i.phase === 'doing').length;
  const doneCount = items.filter(i => i.phase === 'done').length;

  const renderDreamCard = ({ item }: { item: any }) => (
    <Swipeable
      ref={(ref) => {
        swipeableRefs.current[item.id] = ref;
      }}
      renderRightActions={() => renderSwipeDeleteAction(item.id, item.title)}
      overshootRight={false}
      rightThreshold={48}
    >
      <DreamCard
        item={item}
        onPress={() => handleDreamPress(item.id)}
        showUser={false}
        variant="default"
      />
    </Swipeable>
  );

  const ListHeader = () => (
    <View style={styles.header}>
      {/* Greeting */}
      <View style={styles.greetingSection}>
        <View style={styles.greetingRow}>
          <View style={styles.greetingTextCol}>
            <Text style={[styles.greeting, { color: colors.textMuted }]}>
              GOOD MORNING
            </Text>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Hello, {user?.displayName || 'Dreamer'}
            </Text>
          </View>
          <NotificationBell />
        </View>
      </View>

      {/* Stat Cards Horizontal Scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statsScrollContainer}
      >
        <GlassCard intensity={isDark ? 30 : 60} tint={isDark ? 'dark' : 'light'} style={[styles.statCard, { borderLeftColor: colors.primary }]}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total</Text>
          <Text style={[styles.statValue, { color: isDark ? '#FFF' : colors.textPrimary }]}>{totalCount}</Text>
        </GlassCard>
        <GlassCard intensity={isDark ? 30 : 60} tint={isDark ? 'dark' : 'light'} style={[styles.statCard, { borderLeftColor: '#60A5FA' }]}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Dreams</Text>
          <Text style={[styles.statValue, { color: isDark ? '#FFF' : colors.textPrimary }]}>{dreamCount}</Text>
        </GlassCard>
        <GlassCard intensity={isDark ? 30 : 60} tint={isDark ? 'dark' : 'light'} style={[styles.statCard, { borderLeftColor: '#FBBF24' }]}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Doing</Text>
          <Text style={[styles.statValue, { color: isDark ? '#FFF' : colors.textPrimary }]}>{doingCount}</Text>
        </GlassCard>
        <GlassCard intensity={isDark ? 30 : 60} tint={isDark ? 'dark' : 'light'} style={[styles.statCard, { borderLeftColor: '#34D399' }]}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Done</Text>
          <Text style={[styles.statValue, { color: isDark ? '#FFF' : colors.textPrimary }]}>{doneCount}</Text>
        </GlassCard>
      </ScrollView>

      {/* Filters */}
      <View style={styles.filterSection}>
        <SearchBar
          value={searchQuery}
          onChangeText={searchItems}
          placeholder="Search dreams..."
        />
        <FilterChips
          options={STATUS_OPTIONS}
          selected={selectedFilter}
          onSelect={setSelectedFilter}
        />
      </View>
    </View>
  );

  const ListFooter = () => {
    if (!isFetchingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  };

  if (loading && items.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <DreamCardSkeletonList count={5} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <FlatList
        data={phaseFilteredItems}
        renderItem={renderDreamCard}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <EmptyState
            icon={Moon}
            title="No Dreams Yet"
            description="Start your journey by adding your first dream. What have you always wanted to do?"
            action={{
              label: 'Add My First Dream',
              onPress: handleAddDream,
            }}
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (hasMore && !loading && !isFetchingMore) {
            fetchMore();
          }
        }}
        ListFooterComponent={ListFooter}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.accent }]}
        onPress={handleAddDream}
        activeOpacity={0.9}
      >
        <Plus size={32} color="#FFFFFF" strokeWidth={2.5} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  greetingSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greetingTextCol: {
    flex: 1,
  },
  greeting: {
    fontSize: 15,
    marginBottom: 4,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statsScrollContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    minWidth: 120,
    padding: 16,
    borderRadius: 16,
    borderLeftWidth: 4,
  },
  statLabel: {
    fontSize: 11,
    marginBottom: 6,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800',
  },
  filterSection: {
    marginBottom: 8,
    gap: 16,
  },
  listContent: {
    paddingBottom: 160,
  },
  footerLoader: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteAction: {
    width: 108,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  deleteActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F43F5E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
});
