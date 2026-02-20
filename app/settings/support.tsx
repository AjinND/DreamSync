import { useTheme } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import {
    LayoutAnimation,
    Linking,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    UIManager,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '@/src/components/shared';
import { IconButton } from '@/src/components/ui';
import { ChevronLeft } from 'lucide-react-native';

if (
    Platform.OS === 'android' &&
    UIManager.setLayoutAnimationEnabledExperimental
) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FAQS = [
    {
        question: "What is DreamSync?",
        answer: "DreamSync is your personal bucket list manager designed to help you capture, plan, and achieve your life goals. It combines list management with social inspiration."
    },
    {
        question: "How do I share a dream?",
        answer: "You can make your profile public in Privacy settings. In the future, you'll be able to share specific dreams directly via the Share button."
    },
    {
        question: "Is my data private?",
        answer: "Yes, by default your dreams are private. You can choose to share them or make your profile public. We value your privacy."
    },
    {
        question: "How do I delete a dream?",
        answer: "Swipe left on any dream in your list to reveal the delete action."
    },
];

export default function SupportScreen() {
    const { colors } = useTheme();
    const router = useRouter();
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

    const toggleExpand = (index: number) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedIndex(expandedIndex === index ? null : index);
    };

    const handleContact = () => {
        Linking.openURL('mailto:support@dreamsync.app');
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            <Header
                title="Help & Support"
                leftAction={
                    <IconButton icon={ChevronLeft} onPress={() => router.back()} variant="ghost" accessibilityLabel="Go back" />
                }
            />

            <ScrollView style={{ flex: 1 }}>

            <View style={styles.content}>
                <Text style={[styles.header, { color: colors.textPrimary }]}>Frequently Asked Questions</Text>

                <View style={styles.faqList}>
                    {FAQS.map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles.faqItem,
                                { backgroundColor: colors.surface, borderColor: colors.border }
                            ]}
                            onPress={() => toggleExpand(index)}
                            activeOpacity={0.9}
                        >
                            <View style={styles.questionRow}>
                                <Text style={[styles.question, { color: colors.textPrimary }]}>{item.question}</Text>
                                <Ionicons
                                    name={expandedIndex === index ? "chevron-up" : "chevron-down"}
                                    size={20}
                                    color={colors.textSecondary}
                                />
                            </View>
                            {expandedIndex === index && (
                                <Text style={[styles.answer, { color: colors.textSecondary }]}>
                                    {item.answer}
                                </Text>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.contactSection}>
                    <Text style={[styles.contactTitle, { color: colors.textPrimary }]}>Still need help?</Text>
                    <Text style={[styles.contactSubtitle, { color: colors.textSecondary }]}>
                        Our team is here to assist you with any questions or issues.
                    </Text>
                    <TouchableOpacity
                        style={[styles.contactButton, { backgroundColor: colors.primary }]}
                        onPress={handleContact}
                    >
                        <Ionicons name="mail-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
                        <Text style={styles.contactButtonText}>Contact Support</Text>
                    </TouchableOpacity>
                </View>
            </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 20,
    },
    header: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 20,
    },
    faqList: {
        marginBottom: 32,
        gap: 12,
    },
    faqItem: {
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
    },
    questionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    question: {
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
        marginRight: 8,
    },
    answer: {
        marginTop: 12,
        fontSize: 14,
        lineHeight: 20,
    },
    contactSection: {
        alignItems: 'center',
        marginTop: 16,
    },
    contactTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
    },
    contactSubtitle: {
        textAlign: 'center',
        marginBottom: 20,
        fontSize: 14,
    },
    contactButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 24,
    },
    contactButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
});
