import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../theme';
import { Skeleton } from '../ui/Skeleton';

export const ChatListSkeleton: React.FC = () => {
    const { colors } = useTheme();

    // Render 6 skeleton rows
    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            {[1, 2, 3, 4, 5, 6].map((key) => (
                <View
                    key={key}
                    style={{
                        flexDirection: 'row',
                        padding: 16,
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border || '#f1f5f9',
                        alignItems: 'center'
                    }}
                >
                    {/* Avatar */}
                    <Skeleton width={48} height={48} borderRadius={24} />

                    <View style={{ marginLeft: 12, flex: 1 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                            {/* Title */}
                            <Skeleton width={120} height={16} borderRadius={4} />
                            {/* Time */}
                            <Skeleton width={40} height={12} borderRadius={4} />
                        </View>
                        {/* Subtitle */}
                        <Skeleton width="60%" height={12} borderRadius={4} />
                    </View>
                </View>
            ))}
        </View>
    );
};
