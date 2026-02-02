import { useTheme } from '@/src/theme';
import { Memory } from '@/src/types/item';
import { Heart } from 'lucide-react-native';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';

interface MemoryCapsuleProps {
    memories?: Memory[];
    onAdd?: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function MemoryCapsule({ memories = [], onAdd }: MemoryCapsuleProps) {
    const { colors } = useTheme();

    if (!memories || memories.length === 0) return null;

    const featured = memories[0];

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Heart size={18} color={colors.accent} fill={colors.accent} />
                <Text style={[styles.title, { color: colors.textPrimary }]}>Memory Capsule</Text>
            </View>

            <View style={styles.capsule}>
                <Image
                    source={{ uri: featured.imageUrl }}
                    style={styles.image}
                    resizeMode="cover"
                />
                <View style={[styles.captionContainer, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                    <Text style={styles.captionText}>{featured.caption}</Text>
                </View>
            </View>
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
        gap: 8,
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
    },
    capsule: {
        borderRadius: 16,
        overflow: 'hidden',
        height: SCREEN_WIDTH * 0.8, // Square-ish aspect for memories
    },
    image: {
        width: '100%',
        height: '100%',
    },
    captionContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        paddingBottom: 20,
    },
    captionText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '500',
        lineHeight: 20,
    },
});
