/**
 * DreamSync Shared Components - StatusBadge
 */

import { useTheme } from '@/src/theme';
import { Flame, Moon, Trophy } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

type Status = 'dream' | 'doing' | 'done';

interface StatusBadgeProps {
    status: Status;
    size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<Status, { label: string; icon: any }> = {
    dream: { label: 'DREAM', icon: Moon },
    doing: { label: 'DOING', icon: Flame },
    done: { label: 'DONE', icon: Trophy },
};

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
    const { colors } = useTheme();

    const config = STATUS_CONFIG[status];
    const Icon = config.icon;

    const getStatusColor = () => {
        switch (status) {
            case 'dream': return colors.statusDream;
            case 'doing': return colors.statusDoing;
            case 'done': return colors.statusDone;
        }
    };

    const statusColor = getStatusColor();
    const sizeStyles = size === 'sm'
        ? { paddingHorizontal: 8, paddingVertical: 4, fontSize: 10, iconSize: 12 }
        : { paddingHorizontal: 12, paddingVertical: 6, fontSize: 12, iconSize: 14 };

    return (
        <View
            style={[
                styles.badge,
                {
                    backgroundColor: statusColor + '20',
                    paddingHorizontal: sizeStyles.paddingHorizontal,
                    paddingVertical: sizeStyles.paddingVertical,
                },
            ]}
        >
            <Icon size={sizeStyles.iconSize} color={statusColor} style={styles.icon} />
            <Text style={[styles.text, { color: statusColor, fontSize: sizeStyles.fontSize }]}>
                {config.label}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 100,
        alignSelf: 'flex-start',
    },
    icon: {
        marginRight: 4,
    },
    text: {
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});
