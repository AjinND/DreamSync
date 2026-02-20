/**
 * CommunityCardSkeleton — placeholder while community feed loads
 */

import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Skeleton } from '../ui/Skeleton';
import { useTheme } from '@/src/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;

export function CommunityCardSkeleton() {
    const { colors } = useTheme();
    return (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
            {/* Full-width image placeholder */}
            <Skeleton width={SCREEN_WIDTH} height={280} borderRadius={0} />
            <View style={styles.body}>
                {/* Author row */}
                <View style={styles.authorRow}>
                    <Skeleton width={36} height={36} borderRadius={18} />
                    <View style={styles.authorText}>
                        <Skeleton width={100} height={14} borderRadius={6} />
                        <Skeleton width={70} height={12} borderRadius={6} style={styles.authorSub} />
                    </View>
                </View>
                {/* Title */}
                <Skeleton width="85%" height={20} borderRadius={6} />
                <Skeleton width="65%" height={16} borderRadius={6} />
                {/* Action bar */}
                <View style={styles.actions}>
                    <Skeleton width={60} height={28} borderRadius={8} />
                    <Skeleton width={60} height={28} borderRadius={8} />
                    <Skeleton width={60} height={28} borderRadius={8} />
                </View>
            </View>
        </View>
    );
}

export function CommunityCardSkeletonList({ count = 3 }: { count?: number }) {
    return (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <CommunityCardSkeleton key={i} />
            ))}
        </>
    );
}

const styles = StyleSheet.create({
    card: {
        marginBottom: 4,
        overflow: 'hidden',
    },
    body: {
        padding: 16,
        gap: 8,
    },
    authorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 4,
    },
    authorText: {
        gap: 4,
    },
    authorSub: {
        marginTop: 2,
    },
    actions: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 8,
    },
});
