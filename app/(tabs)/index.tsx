/**
 * DreamSync - Home Tab
 * Displays user's dreams with filtering, search, and premium DreamCard UI
 */

import { DreamCard } from '@/src/components/dream';
import { EmptyState, FilterChips, NotificationBell } from '@/src/components/shared';
import { BucketLoaderFull } from '@/src/components/loading/BucketLoaderFull';
import { useBucketStore } from '@/src/store/useBucketStore';
import { useTheme } from '@/src/theme';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Moon, Plus } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  const { items, fetchItems, loading } = useBucketStore();

  const [selectedFilter, setSelectedFilter] = useState<Status>('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  // Refresh data when tab regains focus (avoids stale data when navigating back)
  useFocusEffect(
    useCallback(() => {
      // Only refresh if items are already loaded (avoid loading spinner)
      if (items.length > 0) {
        fetchItems();
      }
    }, [items.length])
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

  // Filter items
  const filteredItems = items.filter((item) => {
    if (selectedFilter === 'all') return true;
    return item.phase === selectedFilter;
  });

  // Stats
  const totalCount = items.length;
  const dreamCount = items.filter(i => i.phase === 'dream').length;
  const doingCount = items.filter(i => i.phase === 'doing').length;
  const doneCount = items.filter(i => i.phase === 'done').length;

  const renderDreamCard = ({ item }: { item: any }) => (
    <DreamCard
      item={item}
      onPress={() => handleDreamPress(item.id)}
      showUser={false}
      variant="default"
    />
  );

  const ListHeader = () => (
    <View style={styles.header}>
      {/* Greeting */}
      <View style={styles.greetingSection}>
        <View style={styles.greetingRow}>
          <View style={styles.greetingTextCol}>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>
              Hello, Dreamer ✨
            </Text>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              My Dreams
            </Text>
          </View>
          <NotificationBell />
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statItem, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{totalCount}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total</Text>
        </View>
        <View style={[styles.statItem, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statValue, { color: colors.statusDream }]}>{dreamCount}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Dreams</Text>
        </View>
        <View style={[styles.statItem, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statValue, { color: colors.statusDoing }]}>{doingCount}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Doing</Text>
        </View>
        <View style={[styles.statItem, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statValue, { color: colors.statusDone }]}>{doneCount}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Done</Text>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filterSection}>
        <FilterChips
          options={STATUS_OPTIONS}
          selected={selectedFilter}
          onSelect={setSelectedFilter}
        />
      </View>
    </View>
  );

  if (loading && items.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <BucketLoaderFull message="Loading your dreams..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <FlatList
        data={filteredItems}
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
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.accent }]}
        onPress={handleAddDream}
        activeOpacity={0.9}
      >
        <Plus size={28} color="#FFFFFF" strokeWidth={2.5} />
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
    fontSize: 14,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 20,
    gap: 8,
  },
  statItem: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterSection: {
    marginBottom: 8,
  },
  listContent: {
    paddingBottom: 100,
  },
  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 32 : 24,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
});
