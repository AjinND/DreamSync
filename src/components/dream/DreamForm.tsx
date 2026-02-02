/**
 * DreamSync Dream Components - DreamForm
 * Form for creating/editing dreams with premium UI
 */

import { Button, Input } from '@/src/components/ui';
import { useTheme } from '@/src/theme';
import { Category, Phase } from '@/src/types/item';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { Calendar, Flame, Image as ImageIcon, Moon, Trophy, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
    Alert,
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface DreamFormValues {
    title: string;
    description: string;
    category: Category;
    phase: Phase;
    imageUri: string | null;
    targetDate: string;
}

interface DreamFormProps {
    initialValues?: Partial<DreamFormValues>;
    onSubmit: (values: DreamFormValues) => Promise<void>;
    isEditing?: boolean;
    isLoading?: boolean;
}

const CATEGORIES: { id: Category; label: string; emoji: string }[] = [
    { id: 'travel', label: 'Travel', emoji: '✈️' },
    { id: 'skill', label: 'Skill', emoji: '🎯' },
    { id: 'adventure', label: 'Adventure', emoji: '🏔️' },
    { id: 'creative', label: 'Creative', emoji: '🎨' },
    { id: 'career', label: 'Career', emoji: '💼' },
    { id: 'health', label: 'Health', emoji: '💪' },
    { id: 'personal', label: 'Personal', emoji: '✨' },
];

const PHASES: { id: Phase; label: string; icon: any; color: string }[] = [
    { id: 'dream', label: 'Dream', icon: Moon, color: '' },
    { id: 'doing', label: 'Doing', icon: Flame, color: '' },
    { id: 'done', label: 'Done', icon: Trophy, color: '' },
];

export function DreamForm({
    initialValues,
    onSubmit,
    isEditing = false,
    isLoading = false,
}: DreamFormProps) {
    const { colors } = useTheme();

    const [title, setTitle] = useState(initialValues?.title || '');
    const [description, setDescription] = useState(initialValues?.description || '');
    const [category, setCategory] = useState<Category>(initialValues?.category || 'personal');
    const [phase, setPhase] = useState<Phase>(initialValues?.phase || 'dream');
    const [imageUri, setImageUri] = useState<string | null>(initialValues?.imageUri || null);
    const [targetDate, setTargetDate] = useState(initialValues?.targetDate || '');
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Sync state with initialValues when they load (for edit mode)
    useEffect(() => {
        if (initialValues) {
            setTitle(initialValues.title || '');
            setDescription(initialValues.description || '');
            setCategory(initialValues.category || 'personal');
            setPhase(initialValues.phase || 'dream');
            setImageUri(initialValues.imageUri || null);
            setTargetDate(initialValues.targetDate || '');
        }
    }, [initialValues]);
    const [errors, setErrors] = useState<{ title?: string }>({});

    const getPhaseColor = (phaseId: Phase) => {
        switch (phaseId) {
            case 'dream': return colors.statusDream;
            case 'doing': return colors.statusDoing;
            case 'done': return colors.statusDone;
        }
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            setImageUri(result.assets[0].uri);
        }
    };

    const handleSubmit = async () => {
        // Validation
        if (!title.trim()) {
            setErrors({ title: 'Please enter a title for your dream' });
            return;
        }

        setErrors({});

        try {
            await onSubmit({
                title: title.trim(),
                description: description.trim(),
                category,
                phase,
                imageUri,
                targetDate,
            });
        } catch (error) {
            Alert.alert('Error', 'Failed to save dream. Please try again.');
        }
    };

    const handleDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setTargetDate(selectedDate.toISOString().split('T')[0]);
        }
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
        >
            {/* Cover Image */}
            <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
                {imageUri ? (
                    <View style={styles.imageContainer}>
                        <Image source={{ uri: imageUri }} style={styles.coverImage} />
                        <TouchableOpacity
                            style={[styles.removeImageButton, { backgroundColor: colors.error }]}
                            onPress={() => setImageUri(null)}
                        >
                            <X size={16} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={[styles.imagePlaceholder, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <ImageIcon size={32} color={colors.textMuted} />
                        <Text style={[styles.imagePlaceholderText, { color: colors.textMuted }]}>
                            Add Cover Image
                        </Text>
                    </View>
                )}
            </TouchableOpacity>

            {/* Title */}
            <Input
                label="Dream Title"
                value={title}
                onChangeText={setTitle}
                placeholder="What's your dream?"
                error={errors.title}
                maxLength={100}
            />

            {/* Description */}
            <Input
                label="Description (Optional)"
                value={description}
                onChangeText={setDescription}
                placeholder="Describe your dream in detail..."
                multiline
                numberOfLines={4}
                style={styles.descriptionInput}
            />

            {/* Category Selection */}
            <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Category</Text>
                <View style={styles.categoryGrid}>
                    {CATEGORIES.map((cat) => (
                        <TouchableOpacity
                            key={cat.id}
                            style={[
                                styles.categoryChip,
                                {
                                    backgroundColor: category === cat.id ? colors.primary : colors.surface,
                                    borderColor: category === cat.id ? colors.primary : colors.border,
                                },
                            ]}
                            onPress={() => setCategory(cat.id)}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                            <Text
                                style={[
                                    styles.categoryLabel,
                                    { color: category === cat.id ? '#FFFFFF' : colors.textSecondary },
                                ]}
                            >
                                {cat.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Phase Selection */}
            <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Status</Text>
                <View style={styles.phaseRow}>
                    {PHASES.map((p) => {
                        const Icon = p.icon;
                        const phaseColor = getPhaseColor(p.id);
                        const isSelected = phase === p.id;

                        return (
                            <TouchableOpacity
                                key={p.id}
                                style={[
                                    styles.phaseChip,
                                    {
                                        backgroundColor: isSelected ? phaseColor + '20' : colors.surface,
                                        borderColor: isSelected ? phaseColor : colors.border,
                                    },
                                ]}
                                onPress={() => setPhase(p.id)}
                                activeOpacity={0.7}
                            >
                                <Icon size={18} color={isSelected ? phaseColor : colors.textMuted} />
                                <Text
                                    style={[
                                        styles.phaseLabel,
                                        { color: isSelected ? phaseColor : colors.textSecondary },
                                    ]}
                                >
                                    {p.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* Target Date */}
            <TouchableOpacity onPress={() => setShowDatePicker(true)} activeOpacity={0.8}>
                <View pointerEvents="none">
                    <Input
                        label="Target Date (Optional)"
                        value={targetDate}
                        placeholder="YYYY-MM-DD"
                        leftIcon={Calendar}
                        editable={false}
                    />
                </View>
            </TouchableOpacity>

            {showDatePicker && (
                <DateTimePicker
                    value={targetDate ? new Date(targetDate) : new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleDateChange}
                    minimumDate={new Date()}
                />
            )}

            {/* Submit Button */}
            <View style={styles.submitSection}>
                <Button
                    title={isEditing ? 'Update Dream' : 'Create Dream'}
                    onPress={handleSubmit}
                    loading={isLoading}
                    fullWidth
                    size="lg"
                />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 16,
        paddingBottom: 40,
    },
    imageContainer: {
        position: 'relative',
        marginBottom: 20,
    },
    coverImage: {
        width: '100%',
        height: 180,
        borderRadius: 16,
    },
    removeImageButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    imagePlaceholder: {
        width: '100%',
        height: 140,
        borderRadius: 16,
        borderWidth: 2,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    imagePlaceholderText: {
        fontSize: 14,
        marginTop: 8,
    },
    descriptionInput: {
        height: 100,
        textAlignVertical: 'top',
    },
    section: {
        marginBottom: 20,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 12,
    },
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 100,
        borderWidth: 1,
        gap: 6,
    },
    categoryEmoji: {
        fontSize: 16,
    },
    categoryLabel: {
        fontSize: 13,
        fontWeight: '500',
    },
    phaseRow: {
        flexDirection: 'row',
        gap: 10,
    },
    phaseChip: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1.5,
        gap: 8,
    },
    phaseLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    submitSection: {
        marginTop: 16,
    },
});
