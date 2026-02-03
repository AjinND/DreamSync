/**
 * UserAvatar - Circular avatar component with fallback initials
 */

import { useTheme } from '@/src/theme';
import { useRouter } from 'expo-router';
import {
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface UserAvatarProps {
    userId?: string;
    name: string;
    avatar?: string;
    size?: 'small' | 'medium' | 'large' | number;
    onPress?: () => void;
    showBorder?: boolean;
}

const SIZES = {
    small: 32,
    medium: 40,
    large: 56,
};

const FONT_SIZES = {
    small: 12,
    medium: 14,
    large: 20,
};

export function UserAvatar({
    userId,
    name,
    avatar,
    size = 'medium',
    onPress,
    showBorder = false,
}: UserAvatarProps) {
    const { colors } = useTheme();
    const router = useRouter();

    const dimension = typeof size === 'number' ? size : SIZES[size];
    const fontSize = typeof size === 'number' ? size * 0.4 : FONT_SIZES[size];

    const initials = name
        .split(' ')
        .map(word => word[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

    const handlePress = () => {
        if (onPress) {
            onPress();
        } else if (userId) {
            router.push(`/profile/${userId}` as any);
        }
    };

    const avatarContent = avatar ? (
        <Image source={{ uri: avatar }} style={[styles.image, { width: dimension, height: dimension }]} />
    ) : (
        <View
            style={[
                styles.fallback,
                {
                    width: dimension,
                    height: dimension,
                    backgroundColor: colors.primary + '20',
                },
            ]}
        >
            <Text style={[styles.initials, { fontSize, color: colors.primary }]}>
                {initials || '?'}
            </Text>
        </View>
    );

    const borderStyle = showBorder
        ? { borderWidth: 2, borderColor: colors.background }
        : {};

    if (userId || onPress) {
        return (
            <TouchableOpacity
                onPress={handlePress}
                style={[
                    styles.container,
                    { borderRadius: dimension / 2 },
                    borderStyle,
                ]}
                activeOpacity={0.7}
            >
                {avatarContent}
            </TouchableOpacity>
        );
    }

    return (
        <View style={[styles.container, { borderRadius: dimension / 2 }, borderStyle]}>
            {avatarContent}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        overflow: 'hidden',
    },
    image: {
        borderRadius: 100,
    },
    fallback: {
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 100,
    },
    initials: {
        fontWeight: '600',
    },
});
