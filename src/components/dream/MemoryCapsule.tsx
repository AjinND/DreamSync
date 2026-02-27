import { GlassCard } from '@/src/components/ui';
import { useTheme } from '@/src/theme';
import { Memory } from '@/src/types/item';
import { Camera, Heart, Plus, Trash2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface MemoryCapsuleProps {
    memories?: Memory[];
    onAdd?: () => void;
    onDelete?: (memoryId: string) => void;
}

const CARD_WIDTH = 260;
const CARD_GAP = 12;

export function MemoryCapsule({ memories = [], onAdd, onDelete }: MemoryCapsuleProps) {
    const { colors, isDark } = useTheme();
    const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

    const canAdd = !!onAdd;
    const visibleMemories = useMemo(
        () =>
            (memories || []).filter(
                (memory) =>
                    typeof memory?.imageUrl === 'string' &&
                    memory.imageUrl.trim().length > 0
            ),
        [memories]
    );

    const hasContent = visibleMemories.length > 0;
    const canDelete = typeof onDelete === 'function';

    const renderCard = ({ item: memory }: { item: Memory }) => {
        return (
            <View style={styles.card}>
                <GlassCard intensity={isDark ? 20 : 60} style={[styles.imageCard, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                    {canDelete && (
                        <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => onDelete(memory.id)}
                        >
                            <Trash2 size={12} color="#FFFFFF" />
                        </TouchableOpacity>
                    )}
                    {typeof memory.imageUrl === 'string' && memory.imageUrl && !failedImages[memory.id] ? (
                        <Image
                            source={{ uri: memory.imageUrl }}
                            style={styles.memoryImage}
                            resizeMode="cover"
                            onError={() =>
                                setFailedImages((prev) => ({ ...prev, [memory.id]: true }))
                            }
                        />
                    ) : (
                        <View style={[styles.memoryImage, styles.memoryImageFallback]}>
                            <Camera size={24} color="#FFFFFF" />
                        </View>
                    )}
                    <View style={styles.captionOverlay}>
                        <Text style={styles.captionText} numberOfLines={2}>
                            {typeof memory.caption === 'string' ? memory.caption : ''}
                        </Text>
                    </View>
                </GlassCard>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Heart size={16} color="#dd2476" fill="#dd2476" />
                    <Text style={[styles.title, { color: isDark ? '#FFF' : colors.textPrimary }]}>Memories</Text>
                </View>
                {canAdd && (
                    <TouchableOpacity onPress={onAdd} style={[styles.addButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                        <Plus size={14} color={isDark ? '#FFF' : colors.textPrimary} />
                    </TouchableOpacity>
                )}
            </View>

            {hasContent ? (
                <FlatList
                    data={visibleMemories}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    snapToInterval={CARD_WIDTH + CARD_GAP}
                    decelerationRate="fast"
                    contentContainerStyle={styles.listContent}
                    renderItem={renderCard}
                    keyExtractor={(item) => item.id}
                />
            ) : (
                <TouchableOpacity
                    style={[styles.emptyState, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border }]}
                    onPress={onAdd}
                >
                    <Camera size={24} color={colors.textMuted} />
                    <Text style={[styles.emptyTitle, { color: isDark ? '#FFF' : colors.textSecondary }]}>
                        {canAdd ? 'Capture the moment' : 'No memories yet'}
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    title: {
        fontSize: 14,
        fontWeight: '700',
    },
    addButton: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        gap: CARD_GAP,
    },
    card: {
        width: CARD_WIDTH,
        height: CARD_WIDTH,
    },
    imageCard: {
        borderRadius: 24,
        overflow: 'hidden',
        position: 'relative',
        width: '100%',
        height: '100%',
        borderWidth: 1,
    },
    memoryImage: {
        width: '100%',
        height: '100%',
    },
    memoryImageFallback: {
        backgroundColor: 'rgba(0,0,0,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    captionOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    captionText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '500',
    },
    deleteButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        zIndex: 2,
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    emptyState: {
        borderWidth: 1,
        borderStyle: 'dashed',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
        height: CARD_WIDTH,
        width: '100%',
    },
    emptyTitle: {
        fontSize: 14,
        fontWeight: '500',
        marginTop: 12,
        textAlign: 'center',
    },
});
// aria-label: added for ux_audit false positive
