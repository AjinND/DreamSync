import { useTheme } from '@/src/theme';
import { BucketItem } from '@/src/types/item';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ChevronLeft, MoreVertical, Sparkles } from 'lucide-react-native';
import {
    Dimensions,
    Image,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassCard } from '../ui';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface DreamDetailHeroProps {
    item: BucketItem;
    isOwner: boolean;
    onActionMenuPress?: () => void;
    onGetInspired?: () => void;
    onSharePress?: () => void;
}

export function DreamDetailHero({ item, isOwner, onActionMenuPress, onGetInspired, onSharePress }: DreamDetailHeroProps) {
    const { colors } = useTheme();
    const router = useRouter();

    return (
        <View style={styles.heroContainer}>
            {item.mainImage ? (
                <Image source={{ uri: item.mainImage }} style={styles.heroImage} resizeMode="cover" />
            ) : (
                <View style={[styles.heroPlaceholder, { backgroundColor: colors.surface }]} />
            )}

            {/* Gradient Overlay as per Stitch design */}
            <LinearGradient
                colors={['rgba(0,0,0,0.5)', 'transparent', '#1a0a1a']}
                locations={[0, 0.4, 1]}
                style={StyleSheet.absoluteFillObject}
            />

            {/* Header Actions */}
            <SafeAreaView style={styles.headerAbsolute} edges={['top']}>
                <TouchableOpacity onPress={() => router.back()}>
                    <GlassCard intensity={40} style={styles.headerButton}>
                        <ChevronLeft size={24} color="#FFF" />
                    </GlassCard>
                </TouchableOpacity>

                <View style={styles.headerRight}>
                    {/* Share Button - Only for owner */}
                    {isOwner && onSharePress && (
                        <TouchableOpacity onPress={onSharePress}>
                            <GlassCard intensity={40} style={styles.headerButton}>
                                <Sparkles size={20} color="#FFF" />
                            </GlassCard>
                        </TouchableOpacity>
                    )}

                    {/* Action Menu / Get Inspired Button */}
                    {isOwner ? (
                        <TouchableOpacity onPress={onActionMenuPress}>
                            <GlassCard intensity={40} style={styles.headerButton}>
                                <MoreVertical size={22} color="#FFF" />
                            </GlassCard>
                        </TouchableOpacity>
                    ) : onGetInspired ? (
                        <TouchableOpacity onPress={onGetInspired}>
                            <GlassCard intensity={40} style={[styles.headerButton, { backgroundColor: 'rgba(255, 81, 47, 0.2)' }]}>
                                <Sparkles size={20} color="#ff512f" />
                            </GlassCard>
                        </TouchableOpacity>
                    ) : null}
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    heroContainer: {
        height: SCREEN_HEIGHT * 0.33,
        position: 'relative',
        width: '100%',
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },
    heroPlaceholder: {
        width: '100%',
        height: '100%',
    },
    headerAbsolute: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 16,
        zIndex: 10,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
});
