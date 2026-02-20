import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, AccessibilityInfo, Animated, Easing } from 'react-native';
import { useTheme } from '@/src/theme';
import { DEFAULT_LOADING_DREAM_ITEMS } from '@/src/constants/loading';

interface BucketLoaderFullProps {
  message?: string;
  submessage?: string;
  timeout?: number; // Show timeout message after N seconds
}

const ITEMS_PER_CYCLE = 5;
const CHECK_INTERVAL_MS = 700;
const CYCLE_RESET_DELAY_MS = 500;
const ENTER_ANIMATION_DURATION_MS = 220;

const pickRandomItems = (items: string[], count: number): string[] => {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
};

export function BucketLoaderFull({
  message = 'Loading your dreams...',
  submessage,
  timeout = 15000, // 15 seconds
}: BucketLoaderFullProps) {
  const { colors } = useTheme();
  const [reducedMotion, setReducedMotion] = useState(false);
  const [showTimeout, setShowTimeout] = useState(false);
  const [checklistItems, setChecklistItems] = useState<string[]>(() =>
    pickRandomItems(DEFAULT_LOADING_DREAM_ITEMS, ITEMS_PER_CYCLE)
  );
  const [checkedCount, setCheckedCount] = useState(0);

  const enterOpacity = useRef(
    Array.from({ length: ITEMS_PER_CYCLE }, () => new Animated.Value(1))
  ).current;
  const enterTranslateY = useRef(
    Array.from({ length: ITEMS_PER_CYCLE }, () => new Animated.Value(0))
  ).current;
  const checkScale = useRef(
    Array.from({ length: ITEMS_PER_CYCLE }, () => new Animated.Value(1))
  ).current;

  useEffect(() => {
    // Check for reduced motion preference
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      setReducedMotion(enabled);
    });

    // Show timeout message after specified duration
    const timer = setTimeout(() => {
      setShowTimeout(true);
    }, timeout);

    return () => clearTimeout(timer);
  }, [timeout]);

  useEffect(() => {
    let isCancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const runCycle = () => {
      const nextItems = pickRandomItems(DEFAULT_LOADING_DREAM_ITEMS, ITEMS_PER_CYCLE);
      setChecklistItems(nextItems);
      setCheckedCount(0);

      let completedChecks = 0;

      const checkNext = () => {
        const timer = setTimeout(() => {
          if (isCancelled) return;

          completedChecks += 1;
          setCheckedCount(completedChecks);

          if (completedChecks < ITEMS_PER_CYCLE) {
            checkNext();
            return;
          }

          const resetTimer = setTimeout(() => {
            if (!isCancelled) {
              runCycle();
            }
          }, CYCLE_RESET_DELAY_MS);
          timers.push(resetTimer);
        }, CHECK_INTERVAL_MS);

        timers.push(timer);
      };

      checkNext();
    };

    runCycle();

    return () => {
      isCancelled = true;
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      enterOpacity.forEach((value) => value.setValue(1));
      enterTranslateY.forEach((value) => value.setValue(0));
      return;
    }

    enterOpacity.forEach((value) => value.setValue(0));
    enterTranslateY.forEach((value) => value.setValue(10));

    const animations = checklistItems.map((_, index) =>
      Animated.parallel([
        Animated.timing(enterOpacity[index], {
          toValue: 1,
          duration: ENTER_ANIMATION_DURATION_MS,
          delay: index * 70,
          useNativeDriver: true,
          easing: Easing.out(Easing.quad),
        }),
        Animated.timing(enterTranslateY[index], {
          toValue: 0,
          duration: ENTER_ANIMATION_DURATION_MS,
          delay: index * 70,
          useNativeDriver: true,
          easing: Easing.out(Easing.quad),
        }),
      ])
    );

    Animated.stagger(40, animations).start();
  }, [checklistItems, reducedMotion, enterOpacity, enterTranslateY]);

  useEffect(() => {
    if (reducedMotion || checkedCount === 0) {
      return;
    }

    const index = checkedCount - 1;
    const scale = checkScale[index];
    scale.setValue(1);

    Animated.sequence([
      Animated.timing(scale, {
        toValue: 1.18,
        duration: 120,
        useNativeDriver: true,
        easing: Easing.out(Easing.quad),
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
        easing: Easing.inOut(Easing.quad),
      }),
    ]).start();
  }, [checkedCount, reducedMotion, checkScale]);

  const checkedItems = useMemo(
    () => checklistItems.map((_, index) => index < checkedCount),
    [checklistItems, checkedCount]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text
          style={[styles.message, { color: colors.textSecondary }]}
          accessibilityLabel={`Loading: ${message}`}
          accessibilityRole="progressbar"
        >
          {message}
        </Text>

        <View
          style={[styles.checklistCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
          accessibilityLabel={`Loading checklist: ${message}`}
        >
          {checklistItems.map((item, index) => {
            const isChecked = checkedItems[index];
            return (
              <Animated.View
                key={`${item}-${index}`}
                style={[
                  styles.row,
                  !reducedMotion && {
                    opacity: enterOpacity[index],
                    transform: [{ translateY: enterTranslateY[index] }],
                  },
                ]}
              >
                <Animated.View
                  style={[
                    styles.checkIcon,
                    {
                      borderColor: isChecked ? colors.success : colors.border,
                      backgroundColor: isChecked ? colors.success : 'transparent',
                      transform: [{ scale: reducedMotion ? 1 : checkScale[index] }],
                    },
                  ]}
                >
                  {isChecked ? <Text style={styles.checkMark}>v</Text> : null}
                </Animated.View>
                <Text
                  style={[
                    styles.rowText,
                    {
                      color: isChecked ? colors.textMuted : colors.textSecondary,
                      opacity: isChecked ? 0.78 : 1,
                      textDecorationLine: isChecked ? 'line-through' : 'none',
                    },
                  ]}
                  numberOfLines={1}
                >
                  {item}
                </Text>
              </Animated.View>
            );
          })}
        </View>

        {submessage && (
          <Text
            style={[styles.submessage, { color: colors.textMuted }]}
          >
            {submessage}
          </Text>
        )}

        {showTimeout && (
          <Text style={[styles.timeoutMessage, { color: colors.textMuted }]}>
            Taking longer than usual. Check your connection.
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  content: {
    gap: 14,
  },
  message: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'GeneralSans',
    textAlign: 'left',
  },
  checklistCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    fontSize: 11,
    lineHeight: 11,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  rowText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'GeneralSans',
  },
  submessage: {
    fontSize: 14,
    fontFamily: 'GeneralSans',
    textAlign: 'left',
  },
  timeoutMessage: {
    fontSize: 12,
    fontFamily: 'GeneralSans',
    textAlign: 'left',
    fontStyle: 'italic',
  },
});
