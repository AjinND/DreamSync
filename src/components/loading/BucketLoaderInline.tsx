import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, AccessibilityInfo } from 'react-native';
import { useTheme } from '@/src/theme';
import { BucketShape } from './components/BucketShape';

interface BucketLoaderInlineProps {
  message?: string;
}

export function BucketLoaderInline({
  message = 'Loading...',
}: BucketLoaderInlineProps) {
  const { colors } = useTheme();
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      setReducedMotion(enabled);
    });
  }, []);

  return (
    <View style={styles.container}>
      <BucketShape
        size="md"
        particleCount={reducedMotion ? 0 : 8}
        showSparkles={!reducedMotion}
        duration={reducedMotion ? 3000 : 2000}
      />

      <Text
        style={[styles.message, { color: colors.textSecondary }]}
        accessibilityLabel={`Loading: ${message}`}
        accessibilityRole="progressbar"
      >
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 16,
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'GeneralSans',
    textAlign: 'center',
  },
});
