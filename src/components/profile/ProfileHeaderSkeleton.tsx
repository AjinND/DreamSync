/**
 * ProfileHeaderSkeleton — placeholder while user profile loads
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from '../ui/Skeleton';
import { useTheme } from '@/src/theme';

export function ProfileHeaderSkeleton() {
    const { colors } = useTheme();
    return (
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
            {/* Banner */}
            <Skeleton width="100%" height={120} borderRadius={0} />
            {/* Avatar overlapping banner */}
            <View style={styles.avatarRow}>
                <Skeleton width={80} height={80} borderRadius={40} style={styles.avatar} />
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Skeleton width={36} height={20} borderRadius={6} />
                        <Skeleton width={52} height={12} borderRadius={6} style={styles.statLabel} />
                    </View>
                    <View style={styles.statItem}>
                        <Skeleton width={36} height={20} borderRadius={6} />
                        <Skeleton width={60} height={12} borderRadius={6} style={styles.statLabel} />
                    </View>
                </View>
            </View>
            {/* Name + bio */}
            <View style={styles.info}>
                <Skeleton width={140} height={22} borderRadius={8} />
                <Skeleton width={200} height={14} borderRadius={6} style={styles.bio} />
                <Skeleton width={160} height={14} borderRadius={6} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        overflow: 'hidden',
        marginBottom: 8,
    },
    avatarRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 16,
        marginTop: -40,
        gap: 16,
    },
    avatar: {
        borderWidth: 3,
        borderColor: '#fff',
    },
    statsRow: {
        flexDirection: 'row',
        gap: 24,
        flex: 1,
        justifyContent: 'flex-end',
        paddingBottom: 4,
    },
    statItem: {
        alignItems: 'center',
        gap: 4,
    },
    statLabel: {
        marginTop: 2,
    },
    info: {
        padding: 16,
        gap: 8,
    },
    bio: {
        marginTop: 4,
    },
});
