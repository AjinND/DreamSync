/**
 * DreamSync Shared Components - EmptyState
 */

import { Button } from '@/src/components/ui';
import { useTheme } from '@/src/theme';
import { BlurView } from 'expo-blur';
import { LucideIcon } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    action?: {
        label: string;
        onPress: () => void;
    };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
    const { colors, isDark } = useTheme();

    return (
        <View style={styles.container}>
            <BlurView
                intensity={isDark ? 20 : 50}
                tint={isDark ? 'dark' : 'light'}
                style={[
                    styles.contentWrapper,
                    {
                        backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.4)',
                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                        borderWidth: 1,
                    }
                ]}
            >
                <View style={[styles.iconContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.primary + '15' }]}>
                    <Icon size={48} color={colors.primary} strokeWidth={1.5} />
                </View>

                <Text style={[styles.title, { color: colors.textPrimary }]}>
                    {title}
                </Text>

                <Text style={[styles.description, { color: colors.textSecondary }]}>
                    {description}
                </Text>

                {action && (
                    <View style={styles.actionContainer}>
                        <Button
                            title={action.label}
                            onPress={action.onPress}
                            variant="primary"
                            size="md"
                        />
                    </View>
                )}
            </BlurView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16, // Reduced from 32 to give the blur view more space
        paddingVertical: 32,
    },
    contentWrapper: {
        paddingHorizontal: 24,
        paddingVertical: 40,
        borderRadius: 24,
        alignItems: 'center',
        width: '100%',
        overflow: 'hidden', // Essential for BlurView
    },
    iconContainer: {
        width: 96,
        height: 96,
        borderRadius: 48,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 8,
    },
    description: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    actionContainer: {
        marginTop: 24,
    },
});
