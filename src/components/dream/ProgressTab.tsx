/**
 * ProgressTab - Progress tracking tab content for Dream Detail Screen
 */

import { EmptyState } from '@/src/components/shared';
import { Card } from '@/src/components/ui';
import { useTheme } from '@/src/theme';
import { BucketItem, ProgressEntry } from '@/src/types/item';
import { Flame, Plus } from 'lucide-react-native';
import {
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface ProgressTabProps {
    item: BucketItem;
    isOwner: boolean;
    onAddProgress: () => void;
}

export function ProgressTab({ item, isOwner, onAddProgress }: ProgressTabProps) {
    const { colors } = useTheme();

    if (item.phase === 'dream') {
        return (
            <EmptyState
                icon={Flame}
                title="Start your journey first"
                description="Move this dream to 'Doing' to start tracking progress"
            />
        );
    }

    return (
        <View style={styles.container}>
            {isOwner && (
                <TouchableOpacity
                    style={[styles.addButton, { borderColor: colors.primary }]}
                    onPress={onAddProgress}
                >
                    <Plus size={18} color={colors.primary} />
                    <Text style={[styles.addButtonText, { color: colors.primary }]}>Add Progress</Text>
                </TouchableOpacity>
            )}

            {item.progress && item.progress.length > 0 ? (
                item.progress.map((entry: ProgressEntry) => (
                    <Card key={entry.id} style={[styles.progressCard, { backgroundColor: colors.surface }]}>
                        {entry.imageUrl && (
                            <Image source={{ uri: entry.imageUrl }} style={styles.progressImage} />
                        )}
                        <View style={styles.progressContent}>
                            <Text style={[styles.progressTitle, { color: colors.textPrimary }]}>
                                {entry.title}
                            </Text>
                            {entry.description && (
                                <Text style={[styles.progressDesc, { color: colors.textSecondary }]}>
                                    {entry.description}
                                </Text>
                            )}
                            <Text style={[styles.progressDate, { color: colors.textMuted }]}>
                                {new Date(entry.date).toLocaleDateString()}
                            </Text>
                        </View>
                    </Card>
                ))
            ) : (
                <EmptyState
                    icon={Flame}
                    title="No progress yet"
                    description="Document your journey by adding progress updates"
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 12,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 14,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderRadius: 12,
        gap: 8,
    },
    addButtonText: {
        fontSize: 15,
        fontWeight: '600',
    },
    progressCard: {
        padding: 0,
        overflow: 'hidden',
        borderRadius: 16,
    },
    progressImage: {
        width: '100%',
        height: 160,
    },
    progressContent: {
        padding: 14,
    },
    progressTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    progressDesc: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 6,
    },
    progressDate: {
        fontSize: 12,
    },
});
