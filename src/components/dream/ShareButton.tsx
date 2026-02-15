/**
 * ShareButton - Floating action button for sharing dreams
 * Overlays the hero image with semi-transparent blur backdrop
 */

import { useTheme } from '@/src/theme';
import { BucketItem } from '@/src/types/item';
import * as Haptics from 'expo-haptics';
import { Globe, Lock } from 'lucide-react-native';
import { ActivityIndicator, Platform, StyleSheet, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';

interface ShareButtonProps {
    item: BucketItem;
    onPress: () => void;
    disabled?: boolean;
    loading?: boolean;
}

export function ShareButton({ item, onPress, disabled = false, loading = false }: ShareButtonProps) {
    const { colors } = useTheme();

    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress();
    };

    const Icon = item.isPublic ? Globe : Lock;
    const iconColor = '#FFF';
    const isDisabled = disabled || loading;

    // Use BlurView on iOS, fallback to solid background on Android/Web
    const BlurWrapper = Platform.OS === 'ios' ? BlurView : ({ children }: any) => children;
    const blurProps = Platform.OS === 'ios' ? { intensity: 80, tint: 'dark' as const } : {};

    return (
        <TouchableOpacity
            style={[
                styles.button,
                isDisabled && styles.buttonDisabled,
                Platform.OS !== 'ios' && {
                    backgroundColor: 'rgba(0,0,0,0.4)',
                },
            ]}
            onPress={handlePress}
            disabled={isDisabled}
            activeOpacity={0.8}
        >
            <BlurWrapper {...blurProps} style={styles.blur}>
                {loading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                ) : (
                    <Icon size={20} color={iconColor} />
                )}
            </BlurWrapper>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        width: 44,
        height: 44,
        borderRadius: 22,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    blur: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
