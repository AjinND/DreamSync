import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, AccessibilityInfo } from 'react-native';
import { useTheme } from '@/src/theme';
import { DEFAULT_LOADING_DREAM_ITEMS } from '@/src/constants/loading';

interface BucketLoaderInlineProps {
  message?: string;
}

const INLINE_ITEMS_COUNT = 3;
const INLINE_CHECK_INTERVAL_MS = 650;
const INLINE_CYCLE_RESET_MS = 450;

const pickRandomItems = (items: string[], count: number): string[] => {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
};

export function BucketLoaderInline({
  message = 'Loading...',
}: BucketLoaderInlineProps) {
  const { colors } = useTheme();
  const [reducedMotion, setReducedMotion] = useState(false);
  const [items, setItems] = useState<string[]>(() =>
    pickRandomItems(DEFAULT_LOADING_DREAM_ITEMS, INLINE_ITEMS_COUNT)
  );
  const [checkedCount, setCheckedCount] = useState(0);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      setReducedMotion(enabled);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const runCycle = () => {
      setItems(pickRandomItems(DEFAULT_LOADING_DREAM_ITEMS, INLINE_ITEMS_COUNT));
      setCheckedCount(0);

      let done = 0;

      const tick = () => {
        const timer = setTimeout(() => {
          if (cancelled) return;
          done += 1;
          setCheckedCount(done);

          if (done < INLINE_ITEMS_COUNT) {
            tick();
            return;
          }

          const resetTimer = setTimeout(() => {
            if (!cancelled) runCycle();
          }, INLINE_CYCLE_RESET_MS);
          timers.push(resetTimer);
        }, INLINE_CHECK_INTERVAL_MS);

        timers.push(timer);
      };

      tick();
    };

    runCycle();

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <View style={[styles.container, { borderColor: colors.borderLight, backgroundColor: colors.surface }]}>
      <Text
        style={[styles.message, { color: colors.textSecondary }]}
        accessibilityLabel={`Loading: ${message}`}
        accessibilityRole="progressbar"
      >
        {message}
      </Text>

      <View style={styles.list}>
        {items.map((item, index) => {
          const isChecked = index < checkedCount;
          return (
            <View key={`${item}-${index}`} style={styles.row}>
              <View
                style={[
                  styles.icon,
                  {
                    borderColor: isChecked ? colors.success : colors.border,
                    backgroundColor: isChecked ? colors.success : 'transparent',
                  },
                ]}
              >
                {isChecked ? <Text style={styles.check}>v</Text> : null}
              </View>
              <Text
                numberOfLines={1}
                style={[
                  styles.itemText,
                  {
                    color: isChecked ? colors.textMuted : colors.textSecondary,
                    opacity: isChecked ? 0.78 : 1,
                    textDecorationLine: isChecked ? 'line-through' : 'none',
                  },
                ]}
              >
                {item}
              </Text>
            </View>
          );
        })}
      </View>

      {reducedMotion ? <Text style={[styles.accessibilityHint, { color: colors.textMuted }]}>Reduced motion enabled</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'GeneralSans',
  },
  list: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    color: '#FFFFFF',
    fontSize: 10,
    lineHeight: 10,
    fontWeight: '700',
  },
  itemText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'GeneralSans',
  },
  accessibilityHint: {
    fontSize: 11,
    fontFamily: 'GeneralSans',
  },
});
