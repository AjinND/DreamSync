/**
 * DreamSync UI Components - Divider
 */

import { useTheme } from '@/src/theme';
import { StyleSheet, View } from 'react-native';

interface DividerProps {
    orientation?: 'horizontal' | 'vertical';
    spacing?: number;
}

export function Divider({
    orientation = 'horizontal',
    spacing = 0,
}: DividerProps) {
    const { colors } = useTheme();

    const isHorizontal = orientation === 'horizontal';

    return (
        <View
            style={[
                isHorizontal ? styles.horizontal : styles.vertical,
                { backgroundColor: colors.border },
                isHorizontal
                    ? { marginVertical: spacing }
                    : { marginHorizontal: spacing },
            ]}
        />
    );
}

const styles = StyleSheet.create({
    horizontal: {
        height: 1,
        width: '100%',
    },
    vertical: {
        width: 1,
        height: '100%',
    },
});
