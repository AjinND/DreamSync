import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../theme';
import { Skeleton } from '../ui/Skeleton';

export const ChatRoomSkeleton: React.FC = () => {
    const { colors } = useTheme();

    return (
        <View style={{ flex: 1, backgroundColor: colors.background, padding: 16 }}>
            {/* Incoming */}
            <View style={{ flexDirection: 'row', marginBottom: 20 }}>
                <Skeleton width={32} height={32} borderRadius={16} />
                <View style={{ marginLeft: 8 }}>
                    <Skeleton width={200} height={40} borderRadius={20} />
                </View>
            </View>

            {/* Outgoing */}
            <View style={{ alignItems: 'flex-end', marginBottom: 20 }}>
                <Skeleton width={180} height={60} borderRadius={20} />
            </View>

            {/* Incoming */}
            <View style={{ flexDirection: 'row', marginBottom: 20 }}>
                <Skeleton width={32} height={32} borderRadius={16} />
                <View style={{ marginLeft: 8 }}>
                    <Skeleton width={150} height={40} borderRadius={20} />
                </View>
            </View>
            {/* Outgoing */}
            <View style={{ alignItems: 'flex-end', marginBottom: 20 }}>
                <Skeleton width={120} height={40} borderRadius={20} />
            </View>
        </View>
    );
};
