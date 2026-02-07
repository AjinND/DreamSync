import { View as MotiView } from 'moti';
import React from 'react';
import { DimensionValue, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';

interface SkeletonProps {
    width?: DimensionValue;
    height?: DimensionValue;
    borderRadius?: number;
    style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({
    width,
    height,
    borderRadius = 4,
    style
}) => {
    const { colors } = useTheme();

    return (
        <MotiView
            from={{ opacity: 0.5 }}
            animate={{ opacity: 1 }}
            transition={{
                type: 'timing',
                duration: 1000,
                loop: true,
            }}
            style={[{
                width,
                height,
                borderRadius,
                backgroundColor: colors.borderLight || '#E2E8F0',
            }, style]}
        />
    );
};
