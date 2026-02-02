/**
 * DreamSync UI Components - Avatar
 */

import { useTheme } from '@/src/theme';
import { CheckCircle } from 'lucide-react-native';
import { Image, StyleSheet, Text, View } from 'react-native';

interface AvatarProps {
    uri?: string;
    name?: string;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    showBadge?: boolean;
    isVerified?: boolean;
}

export function Avatar({
    uri,
    name,
    size = 'md',
    showBadge = false,
    isVerified = false,
}: AvatarProps) {
    const { colors } = useTheme();

    const sizes = {
        xs: { dimension: 24, fontSize: 10, badgeSize: 8 },
        sm: { dimension: 32, fontSize: 12, badgeSize: 10 },
        md: { dimension: 40, fontSize: 16, badgeSize: 12 },
        lg: { dimension: 56, fontSize: 20, badgeSize: 16 },
        xl: { dimension: 80, fontSize: 28, badgeSize: 20 },
    };

    const { dimension, fontSize, badgeSize } = sizes[size];

    const getInitials = () => {
        if (!name) return '?';
        const parts = name.trim().split(' ');
        if (parts.length >= 2) {
            return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        }
        return name[0].toUpperCase();
    };

    return (
        <View style={[styles.container, { width: dimension, height: dimension }]}>
            {uri ? (
                <Image
                    source={{ uri }}
                    style={[
                        styles.image,
                        {
                            width: dimension,
                            height: dimension,
                            borderRadius: dimension / 2,
                        },
                    ]}
                />
            ) : (
                <View
                    style={[
                        styles.placeholder,
                        {
                            width: dimension,
                            height: dimension,
                            borderRadius: dimension / 2,
                            backgroundColor: colors.primary + '30',
                        },
                    ]}
                >
                    <Text
                        style={[
                            styles.initials,
                            { fontSize, color: colors.primary },
                        ]}
                    >
                        {getInitials()}
                    </Text>
                </View>
            )}

            {showBadge && isVerified && (
                <View
                    style={[
                        styles.badge,
                        {
                            width: badgeSize,
                            height: badgeSize,
                            backgroundColor: colors.surface,
                            borderRadius: badgeSize / 2,
                        },
                    ]}
                >
                    <CheckCircle
                        size={badgeSize - 2}
                        color={colors.secondary}
                        fill={colors.secondary}
                    />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'relative',
    },
    image: {
        resizeMode: 'cover',
    },
    placeholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    initials: {
        fontWeight: '600',
    },
    badge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
