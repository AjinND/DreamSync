import { useTheme } from '@/src/theme';
import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';

interface NeoGlowProps extends ViewProps {
    color?: string;
    opacity?: number;
    radius?: number;
}

export const NeoGlow: React.FC<NeoGlowProps> = ({
    children,
    style,
    color,
    opacity = 0.3,
    radius = 15,
    ...rest
}) => {
    const { colors } = useTheme();
    const glowColor = color || colors.primary;

    return (
        <View
            style={[
                styles.glow,
                {
                    shadowColor: glowColor,
                    shadowOpacity: opacity,
                    shadowRadius: radius,
                    elevation: radius / 1.5,
                },
                style
            ]}
            {...rest}
        >
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    glow: {
        shadowOffset: { width: 0, height: 0 },
    }
});
