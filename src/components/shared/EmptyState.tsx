/**
 * DreamSync Shared Components - EmptyState
 */

import { Button } from '@/src/components/ui';
import { useTheme } from '@/src/theme';
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
    const { colors } = useTheme();

    return (
        <View style={styles.container}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
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
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
        paddingVertical: 48,
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
