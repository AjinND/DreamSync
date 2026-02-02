/**
 * DreamSync Shared Components - UserRow
 */

import { Avatar } from '@/src/components/ui';
import { useTheme } from '@/src/theme';
import { CheckCircle } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface User {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string;
    isVerified?: boolean;
}

interface UserRowProps {
    user: User;
    onPress?: () => void;
    rightElement?: React.ReactNode;
}

export function UserRow({ user, onPress, rightElement }: UserRowProps) {
    const { colors } = useTheme();

    const Content = (
        <View style={styles.container}>
            <Avatar uri={user.avatarUrl} name={user.displayName} size="md" />

            <View style={styles.info}>
                <View style={styles.nameRow}>
                    <Text style={[styles.displayName, { color: colors.textPrimary }]}>
                        {user.displayName}
                    </Text>
                    {user.isVerified && (
                        <CheckCircle size={14} color={colors.secondary} fill={colors.secondary} style={styles.verifiedIcon} />
                    )}
                </View>
                <Text style={[styles.username, { color: colors.textMuted }]}>
                    @{user.username}
                </Text>
            </View>

            {rightElement && (
                <View style={styles.rightSection}>
                    {rightElement}
                </View>
            )}
        </View>
    );

    if (onPress) {
        return (
            <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
                {Content}
            </TouchableOpacity>
        );
    }

    return Content;
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    info: {
        flex: 1,
        marginLeft: 12,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    displayName: {
        fontSize: 16,
        fontWeight: '600',
    },
    verifiedIcon: {
        marginLeft: 4,
    },
    username: {
        fontSize: 14,
        marginTop: 2,
    },
    rightSection: {
        marginLeft: 12,
    },
});
