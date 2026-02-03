/**
 * ProfileDreamGrid - Grid of user's public dreams
 */

import { useTheme } from '@/src/theme';
import { BucketItem } from '@/src/types/item';
import { useRouter } from 'expo-router';
import { Target } from 'lucide-react-native';
import {
    Dimensions,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = 8;
const ITEM_SIZE = (SCREEN_WIDTH - 32 - GRID_GAP * 2) / 3;

const CATEGORY_EMOJI: Record<string, string> = {
    travel: '✈️',
    skill: '🎯',
    adventure: '🏔️',
    creative: '🎨',
    career: '💼',
    health: '💪',
    personal: '✨',
    other: '🌟',
};

interface ProfileDreamGridProps {
    dreams: BucketItem[];
}

export function ProfileDreamGrid({ dreams }: ProfileDreamGridProps) {
    const { colors } = useTheme();
    const router = useRouter();

    if (dreams.length === 0) {
        return (
            <View style={[styles.emptyContainer, { backgroundColor: colors.surface }]}>
                <Target size={32} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                    No public dreams yet
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Public Dreams
            </Text>
            <View style={styles.grid}>
                {dreams.map(dream => (
                    <TouchableOpacity
                        key={dream.id}
                        style={styles.gridItem}
                        onPress={() => router.push(`/item/${dream.id}`)}
                        activeOpacity={0.8}
                    >
                        {dream.mainImage ? (
                            <Image
                                source={{ uri: dream.mainImage }}
                                style={styles.gridImage}
                            />
                        ) : (
                            <View style={[styles.gridPlaceholder, { backgroundColor: colors.primary + '20' }]}>
                                <Text style={styles.placeholderEmoji}>
                                    {CATEGORY_EMOJI[dream.category] || '🌟'}
                                </Text>
                            </View>
                        )}
                        <View style={[styles.gridOverlay, { backgroundColor: 'rgba(0,0,0,0.3)' }]} />
                        <Text style={styles.gridTitle} numberOfLines={2}>
                            {dream.title}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: GRID_GAP,
    },
    gridItem: {
        width: ITEM_SIZE,
        height: ITEM_SIZE,
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
    },
    gridImage: {
        width: '100%',
        height: '100%',
    },
    gridPlaceholder: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    placeholderEmoji: {
        fontSize: 28,
    },
    gridOverlay: {
        ...StyleSheet.absoluteFillObject,
    },
    gridTitle: {
        position: 'absolute',
        bottom: 6,
        left: 6,
        right: 6,
        color: '#FFF',
        fontSize: 11,
        fontWeight: '600',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    emptyContainer: {
        padding: 32,
        borderRadius: 16,
        alignItems: 'center',
        gap: 12,
    },
    emptyText: {
        fontSize: 14,
    },
});
