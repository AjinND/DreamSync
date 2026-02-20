/**
 * DreamCardSkeleton — placeholder while dream cards are loading
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from '../ui/Skeleton';
import { useTheme } from '@/src/theme';

export function DreamCardSkeleton() {
    const { colors } = useTheme();
    return (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
            {/* Image placeholder */}
            <Skeleton width="100%" height={160} borderRadius={12} />
            <View style={styles.body}>
                {/* Category badge */}
                <Skeleton width={72} height={20} borderRadius={10} />
                {/* Title */}
                <Skeleton width="80%" height={22} borderRadius={6} style={styles.title} />
                <Skeleton width="60%" height={16} borderRadius={6} style={styles.subtitle} />
                {/* Footer row */}
                <View style={styles.footer}>
                    <Skeleton width={28} height={28} borderRadius={14} />
                    <Skeleton width={80} height={14} borderRadius={6} />
                    <Skeleton width={40} height={14} borderRadius={6} />
                </View>
            </View>
        </View>
    );
}

export function DreamCardSkeletonList({ count = 4 }: { count?: number }) {
    return (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <DreamCardSkeleton key={i} />
            ))}
        </>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 16,
        marginHorizontal: 16,
        marginBottom: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
    },
    body: {
        padding: 16,
        gap: 8,
    },
    title: {
        marginTop: 4,
    },
    subtitle: {
        marginBottom: 4,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
    },
});
