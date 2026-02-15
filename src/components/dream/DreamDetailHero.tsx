/**
 * DreamDetailHero - Hero Section for Dream Detail Screen
 * Clean minimalistic design with Lucide icons (no emojis)
 */

import { useTheme } from '@/src/theme';
import { BucketItem, Phase } from '@/src/types/item';
import { useRouter } from 'expo-router';
import {
    Briefcase,
    ChevronLeft,
    Heart,
    MoreVertical,
    Mountain,
    Palette,
    Plane,
    Sparkles,
    Star,
    Target,
} from 'lucide-react-native';
import {
    Dimensions,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrivacyBadge } from './PrivacyBadge';
import { ShareButton } from './ShareButton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CATEGORY_ICONS: Record<string, { icon: any; label: string }> = {
    travel: { icon: Plane, label: 'Travel' },
    skill: { icon: Target, label: 'Skill' },
    adventure: { icon: Mountain, label: 'Adventure' },
    creative: { icon: Palette, label: 'Creative' },
    career: { icon: Briefcase, label: 'Career' },
    health: { icon: Heart, label: 'Health' },
    personal: { icon: Sparkles, label: 'Personal' },
    other: { icon: Star, label: 'Other' },
};

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
    const categoryInfo = CATEGORY_ICONS[item.category] || CATEGORY_ICONS.other;
    const CategoryIcon = categoryInfo.icon;

    const getPhaseColor = (phase: Phase) => {
        switch (phase) {
            case 'dream': return colors.statusDream;
            case 'doing': return colors.statusDoing;
            case 'done': return colors.statusDone;
        }
    };

    return (
        <View style={styles.heroContainer}>
            {item.mainImage ? (
                <Image source={{ uri: item.mainImage }} style={styles.heroImage} resizeMode="cover" />
            ) : (
                <View style={[styles.heroPlaceholder, { backgroundColor: getPhaseColor(item.phase) }]}>
                    <CategoryIcon size={48} color="rgba(255,255,255,0.8)" />
                </View>
            )}

            <View style={styles.heroOverlay} />

            {/* Header Actions */}
            <SafeAreaView style={styles.headerAbsolute} edges={['top']}>
                <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
                    <ChevronLeft size={20} color="#FFF" />
                </TouchableOpacity>

                <View style={styles.headerRight}>
                    {/* Share Button - Only for owner */}
                    {isOwner && onSharePress && (
                        <ShareButton
                            item={item}
                            onPress={onSharePress}
                            disabled={false}
                        />
                    )}

                    {/* Action Menu / Get Inspired Button */}
                    {isOwner ? (
                        <TouchableOpacity style={styles.headerButton} onPress={onActionMenuPress}>
                            <MoreVertical size={20} color="#FFF" />
                        </TouchableOpacity>
                    ) : onGetInspired ? (
                        <TouchableOpacity
                            style={[styles.headerButton, { backgroundColor: colors.accent }]}
                            onPress={onGetInspired}
                        >
                            <Sparkles size={20} color="#FFF" />
                        </TouchableOpacity>
                    ) : null}
                </View>
            </SafeAreaView>

            {/* Hero Content */}
            <View style={styles.heroContent}>
                <View style={styles.heroContentTop}>
                    <View style={styles.categoryPill}>
                        <CategoryIcon size={14} color="#FFF" />
                        <Text style={styles.categoryPillText}>{categoryInfo.label}</Text>
                    </View>
                </View>
                <Text style={styles.heroTitle} numberOfLines={2}>{item.title}</Text>
                <PrivacyBadge isPublic={item.isPublic || false} size="small" />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    heroContainer: {
        height: SCREEN_WIDTH * 0.6,
        position: 'relative',
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },
    heroPlaceholder: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.35)',
    },
    headerAbsolute: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 8,
        zIndex: 10,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.4)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroContent: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        paddingBottom: 24,
    },
    heroContentTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    categoryPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignSelf: 'flex-start',
        marginBottom: 8,
    },
    categoryPillText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#FFF',
    },
    heroTitle: {
        fontSize: 26,
        fontWeight: '700',
        color: '#FFF',
        textShadowColor: 'rgba(0,0,0,0.4)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
});
