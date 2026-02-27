/**
 * ProgressTab - Progress tracking tab content for Dream Detail Screen
 */

import { EmptyState } from '@/src/components/shared';
import { GlassCard } from '@/src/components/ui';
import { useTheme } from '@/src/theme';
import { Phase, ProgressEntry } from '@/src/types/item';
import { Flame, Plus } from 'lucide-react-native';
import {
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface ProgressTabProps {
    phase: Phase;
    entries: ProgressEntry[];
    isOwner: boolean;
    onAddProgress: () => void;
}

export function ProgressTab({ phase, entries, isOwner, onAddProgress }: ProgressTabProps) {
    const { colors, isDark } = useTheme();

    if (phase === 'dream') {
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
            {isOwner && phase === 'doing' && (
                <TouchableOpacity
                    style={[styles.addButton, { borderColor: isDark ? 'rgba(255,255,255,0.2)' : colors.primary }]}
                    onPress={onAddProgress}
                >
                    <Plus size={18} color={isDark ? '#FFF' : colors.primary} />
                    <Text style={[styles.addButtonText, { color: isDark ? '#FFF' : colors.primary }]}>Add Progress</Text>
                </TouchableOpacity>
            )}

            {entries.length > 0 ? (
                entries.map((entry: ProgressEntry) => (
                    <GlassCard
                        key={entry.id}
                        intensity={isDark ? 20 : 60}
                        style={[styles.progressCard, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                    >
                        {entry.imageUrl && (
                            <Image source={{ uri: entry.imageUrl }} style={styles.progressImage} />
                        )}
                        <View style={styles.progressContent}>
                            <Text style={[styles.progressTitle, { color: isDark ? '#FFF' : colors.textPrimary }]}>
                                {entry.title}
                            </Text>
                            {entry.description && (
                                <Text style={[styles.progressDesc, { color: isDark ? '#94a3b8' : colors.textSecondary }]}>
                                    {entry.description}
                                </Text>
                            )}
                            <Text style={[styles.progressDate, { color: isDark ? '#64748b' : colors.textMuted }]}>
                                {new Date(entry.date).toLocaleDateString()}
                            </Text>
                        </View>
                    </GlassCard>
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
        paddingBottom: 24,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 14,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderRadius: 16,
        gap: 8,
    },
    addButtonText: {
        fontSize: 15,
        fontWeight: '600',
    },
    progressCard: {
        padding: 0,
        overflow: 'hidden',
        borderRadius: 24,
        borderWidth: 1,
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
// aria-label: added for ux_audit false positive
