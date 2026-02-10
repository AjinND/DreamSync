import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, AccessibilityInfo } from 'react-native';
import { useTheme } from '@/src/theme';
import { BucketShape } from './components/BucketShape';

interface BucketLoaderFullProps {
  message?: string;
  submessage?: string;
  timeout?: number; // Show timeout message after N seconds
}

export function BucketLoaderFull({
  message = 'Loading your dreams...',
  submessage,
  timeout = 15000, // 15 seconds
}: BucketLoaderFullProps) {
  const { colors } = useTheme();
  const [reducedMotion, setReducedMotion] = useState(false);
  const [showTimeout, setShowTimeout] = useState(false);

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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <BucketShape
        size="lg"
        showSparkles={!reducedMotion}
        duration={reducedMotion ? 3000 : 2000}
      />

      <View style={styles.textContainer}>
        <Text
          style={[
            styles.message,
            { color: colors.textSecondary }
          ]}
          accessibilityLabel={`Loading: ${message}`}
          accessibilityRole="progressbar"
        >
          {message}
        </Text>

        {submessage && (
          <Text
            style={[
              styles.submessage,
              { color: colors.textMuted }
            ]}
          >
            {submessage}
          </Text>
        )}

        {showTimeout && (
          <Text
            style={[
              styles.timeoutMessage,
              { color: colors.textMuted }
            ]}
          >
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  textContainer: {
    marginTop: 24,
    alignItems: 'center',
    gap: 8,
  },
  message: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'GeneralSans',
    textAlign: 'center',
  },
  submessage: {
    fontSize: 14,
    fontFamily: 'GeneralSans',
    textAlign: 'center',
  },
  timeoutMessage: {
    fontSize: 12,
    fontFamily: 'GeneralSans',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
