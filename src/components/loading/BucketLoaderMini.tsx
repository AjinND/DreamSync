import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useTheme } from '@/src/theme';

export function BucketLoaderMini() {
  const { colors } = useTheme();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setChecked((prev) => !prev);
    }, 650);

    return () => clearInterval(timer);
  }, []);

  return (
    <View style={styles.container} accessibilityRole="progressbar" accessibilityLabel="Loading checklist">
      <View
        style={[
          styles.icon,
          {
            borderColor: checked ? colors.success : colors.border,
            backgroundColor: checked ? colors.success : 'transparent',
          },
        ]}
      >
        {checked ? <Text style={styles.check}>v</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  icon: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    color: '#FFFFFF',
    fontSize: 9,
    lineHeight: 9,
    fontWeight: '700',
  },
});
