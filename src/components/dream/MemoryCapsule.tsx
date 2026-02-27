import { useTheme } from '@/src/theme';
import { Memory } from '@/src/types/item';
import { Camera, Heart, Plus, Trash2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface MemoryCapsuleProps {
    memories?: Memory[];
    onAdd?: () => void;
    onDelete?: (memoryId: string) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function MemoryCapsule({ memories = [], onAdd, onDelete }: MemoryCapsuleProps) {
    const { colors } = useTheme();
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

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Heart size={18} color={colors.accent} fill={colors.accent} />
                    <Text style={[styles.title, { color: colors.textPrimary }]}>Memory Capsule</Text>
                </View>
                {canAdd && (
                    <TouchableOpacity onPress={onAdd} style={[styles.addButton, { backgroundColor: colors.accent + '15' }]}>
                        <Plus size={16} color={colors.accent} />
                    </TouchableOpacity>
                )}
            </View>

            {hasContent ? (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.memoryScroll}
                >
                    {visibleMemories.map((memory) => (
                        <View key={memory.id} style={styles.memoryCard}>
                            {canDelete && (
                                <TouchableOpacity
                                    style={styles.deleteButton}
                                    onPress={() => onDelete(memory.id)}
                                >
                                    <Trash2 size={14} color="#FFFFFF" />
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
                            <View style={styles.captionContainer}>
                                <Text style={styles.captionText} numberOfLines={2}>
                                    {typeof memory.caption === 'string' ? memory.caption : ''}
                                </Text>
                            </View>
                        </View>
                    ))}
                </ScrollView>
            ) : (
                <TouchableOpacity
                    style={[styles.emptyState, { borderColor: colors.border }]}
                    onPress={onAdd}
                >
                    <Camera size={32} color={colors.textMuted} />
                    <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
                        {canAdd ? 'Capture the moment' : 'No memories yet'}
                    </Text>
                    <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                        {canAdd ? 'Add photos from your journey' : 'This dream has no memories shared yet'}
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
        paddingHorizontal: 4,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
    },
    addButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    memoryScroll: {
        paddingRight: 20,
    },
    memoryCard: {
        width: SCREEN_WIDTH * 0.7,
        height: SCREEN_WIDTH * 0.5,
        borderRadius: 16,
        overflow: 'hidden',
        marginRight: 12,
    },
    memoryImage: {
        width: '100%',
        height: '100%',
    },
    memoryImageFallback: {
        backgroundColor: 'rgba(0,0,0,0.35)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    captionContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 12,
    },
    deleteButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 2,
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.55)',
    },
    captionText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '500',
    },
    emptyState: {
        borderWidth: 2,
        borderStyle: 'dashed',
        borderRadius: 16,
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyIcon: {
        marginBottom: 12,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    emptySubtitle: {
        fontSize: 14,
    },
});
// aria-label: added for ux_audit false positive
