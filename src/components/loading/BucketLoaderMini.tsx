import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BucketShape } from './components/BucketShape';

export function BucketLoaderMini() {
  return (
    <View style={styles.container} accessibilityRole="progressbar">
      <BucketShape size="sm" showSparkles={false} duration={1500} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
});
