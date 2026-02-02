import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { auth } from '../../firebaseConfig';
import { StorageService } from '../../src/services/storage';
import { useBucketStore } from '../../src/store/useBucketStore';
import { colors, gradients } from '../../src/theme';
import { Category, Phase } from '../../src/types/item';

const CATEGORIES: { id: Category; label: string; icon: string; color: string }[] = [
    { id: 'travel', label: 'Travel', icon: 'airplane', color: '#3B82F6' },
    { id: 'skill', label: 'Skill', icon: 'school', color: '#8B5CF6' },
    { id: 'adventure', label: 'Adventure', icon: 'compass', color: '#F59E0B' },
    { id: 'creative', label: 'Creative', icon: 'color-palette', color: '#EC4899' },
    { id: 'career', label: 'Career', icon: 'briefcase', color: '#64748B' },
    { id: 'health', label: 'Health', icon: 'fitness', color: '#EF4444' },
    { id: 'personal', label: 'Personal', icon: 'person', color: '#10B981' },
];

export default function AddItemScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { id } = params;
    const isEditing = !!id;

    // console.log("[AddItem] Params:", params);
    // console.log("[AddItem] ID:", id, "Type:", typeof id);
    // console.log("[AddItem] isEditing:", isEditing);

    const { addItem, updateItem, items } = useBucketStore();
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<Category>('travel');
    const [phase, setPhase] = useState<Phase>('dream');
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [targetDate, setTargetDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingParams, setLoadingParams] = useState({ text: 'Saving...' });

    useEffect(() => {
        if (isEditing && typeof id === 'string') {
            const existingItem = items.find(i => i.id === id);
            if (existingItem) {
                setTitle(existingItem.title);
                setDescription(existingItem.description || '');
                setSelectedCategory(existingItem.category);
                setPhase(existingItem.phase);
                if (existingItem.mainImage) setImageUri(existingItem.mainImage);
                if (existingItem.targetDate) {
                    setTargetDate(new Date(existingItem.targetDate).toISOString().split('T')[0]);
                }
            }
        }

        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start();
    }, [id, items]);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.8,
        });

        if (!result.canceled) {
            setImageUri(result.assets[0].uri);
        }
    };

    const handleSave = async () => {
        if (!title.trim()) {
            Alert.alert("Required", "Please enter a title for your dream.");
            return;
        }

        setLoading(true);
        setLoadingParams({ text: isEditing ? 'Updating flow...' : 'Saving dream...' });

        try {
            let finalImageUri = imageUri || undefined;

            // Upload image ONLY if it's new (local file URI)
            // If it starts with 'http', it's already remote
            if (imageUri && !imageUri.startsWith('http')) {
                setLoadingParams({ text: 'Uploading image...' });
                const userId = auth.currentUser?.uid;
                if (userId) {
                    const fileName = `covers/${userId}/${Date.now()}.jpg`;
                    finalImageUri = await StorageService.uploadImage(imageUri, fileName);
                }
            }

            setLoadingParams({ text: 'Finalizing...' });

            if (isEditing && typeof id === 'string') {
                await updateItem(id, {
                    title,
                    description,
                    category: selectedCategory,
                    phase,
                    mainImage: finalImageUri,
                    targetDate: targetDate ? new Date(targetDate).getTime() : undefined,
                });
            } else {
                await addItem({
                    title,
                    description,
                    category: selectedCategory,
                    phase,
                    mainImage: finalImageUri,
                    targetDate: targetDate ? new Date(targetDate).getTime() : undefined,
                });
            }

            router.back();
        } catch (e: any) {
            console.error("Error saving:", e);
            Alert.alert("Error", e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Header Background */}
            <View style={styles.headerBackground}>
                <LinearGradient
                    colors={gradients.dream.colors as any}
                    style={StyleSheet.absoluteFillObject}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />

                {/* Header Content */}
                <View style={styles.headerContent}>
                    <View style={styles.headerTopRow}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                            <Ionicons name="close" size={24} color="white" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>{isEditing ? "Edit Dream" : "New Dream"}</Text>
                        <TouchableOpacity
                            onPress={handleSave}
                            disabled={loading}
                            style={[styles.saveButton, loading && styles.buttonDisabled]}
                        >
                            <Text style={styles.saveButtonText}>{loading ? "..." : "Save"}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <Animated.View style={{ opacity: fadeAnim }}>
                    {/* Title Input */}
                    <View style={styles.section}>
                        <Text style={styles.label}>TITLE</Text>
                        <TextInput
                            style={styles.titleInput}
                            placeholder="What's your dream?"
                            placeholderTextColor={colors.slate[300]}
                            multiline
                            value={title}
                            onChangeText={setTitle}
                        />
                    </View>

                    {/* Phase Selection */}
                    <View style={styles.section}>
                        <Text style={styles.label}>CURRENT PHASE</Text>
                        <View style={styles.phaseContainer}>
                            {(['dream', 'doing', 'done'] as Phase[]).map((p) => {
                                const isActive = phase === p;
                                const activeColor = p === 'dream' ? colors.dream.default
                                    : p === 'doing' ? colors.doing.default
                                        : colors.done.default;

                                return (
                                    <TouchableOpacity
                                        key={p}
                                        onPress={() => setPhase(p)}
                                        style={[
                                            styles.phaseButton,
                                            isActive && styles.phaseButtonActive,
                                            isActive && { backgroundColor: activeColor + '15', borderColor: activeColor }
                                        ]}
                                    >
                                        <Text style={[
                                            styles.phaseText,
                                            isActive && { color: activeColor }
                                        ]}>
                                            {p}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* Category Selection */}
                    <View style={styles.section}>
                        <Text style={styles.label}>CATEGORY</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.categoriesContent}
                        >
                            {CATEGORIES.map((cat) => (
                                <TouchableOpacity
                                    key={cat.id}
                                    onPress={() => setSelectedCategory(cat.id)}
                                    style={[
                                        styles.categoryCard,
                                        selectedCategory === cat.id && styles.categoryCardActive,
                                        selectedCategory === cat.id && { borderColor: cat.color, backgroundColor: cat.color + '10' }
                                    ]}
                                >
                                    <View style={[styles.categoryIcon, { backgroundColor: cat.color + '20' }]}>
                                        <Ionicons name={cat.icon as any} size={20} color={cat.color} />
                                    </View>
                                    <Text style={[
                                        styles.categoryLabel,
                                        selectedCategory === cat.id && { color: colors.slate[900], fontWeight: '700' }
                                    ]}>
                                        {cat.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Target Date */}
                    <View style={styles.section}>
                        <Text style={styles.label}>TARGET DATE (OPTIONAL)</Text>
                        <TextInput
                            style={styles.dateInput}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor={colors.slate[300]}
                            value={targetDate}
                            onChangeText={setTargetDate}
                            maxLength={10}
                            keyboardType="numbers-and-punctuation"
                        />
                    </View>

                    {/* Cover Image */}
                    <View style={styles.section}>
                        <Text style={styles.label}>COVER IMAGE</Text>
                        <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
                            {imageUri ? (
                                <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
                            ) : (
                                <View style={styles.imagePlaceholder}>
                                    <Ionicons name="image-outline" size={32} color={colors.slate[400]} />
                                    <Text style={styles.imagePlaceholderText}>Tap to upload cover</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Description */}
                    <View style={[styles.section, { marginBottom: 40 }]}>
                        <Text style={styles.label}>WHY THIS MATTERS?</Text>
                        <TextInput
                            style={styles.descriptionInput}
                            placeholder="Describe your motivation..."
                            placeholderTextColor={colors.slate[400]}
                            multiline
                            textAlignVertical="top"
                            value={description}
                            onChangeText={setDescription}
                        />
                    </View>
                </Animated.View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    headerBackground: {
        height: Platform.OS === 'ios' ? 120 : 100,
        width: '100%',
        backgroundColor: colors.indigo[900],
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        overflow: 'hidden',
        zIndex: 10,
        shadowColor: colors.indigo[900],
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 8,
    },
    headerContent: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingHorizontal: 24,
    },
    headerTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.white,
    },
    saveButton: {
        backgroundColor: colors.white,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    saveButtonText: {
        color: colors.indigo[600],
        fontWeight: 'bold',
        fontSize: 14,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 24,
        paddingTop: 32,
    },
    section: {
        marginBottom: 24,
    },
    label: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.slate[400],
        marginBottom: 12,
        letterSpacing: 1,
    },
    titleInput: {
        fontSize: 32,
        fontWeight: 'bold',
        color: colors.slate[900],
        padding: 0,
    },
    phaseContainer: {
        flexDirection: 'row',
        backgroundColor: colors.slate[50],
        padding: 4,
        borderRadius: 12,
    },
    phaseButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    phaseButtonActive: {
        backgroundColor: colors.white,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    phaseText: {
        fontSize: 14,
        fontWeight: '600',
        textTransform: 'capitalize',
        color: colors.slate[400],
    },
    categoriesContent: {
        paddingRight: 24,
    },
    categoryCard: {
        marginRight: 12,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.slate[100],
        alignItems: 'center',
        width: 100,
        backgroundColor: colors.white,
    },
    categoryCardActive: {
        backgroundColor: colors.indigo[50],
        borderColor: colors.indigo[200],
    },
    categoryIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    categoryLabel: {
        fontSize: 12,
        fontWeight: '500',
        color: colors.slate[500],
    },
    imagePicker: {
        height: 200,
        backgroundColor: colors.slate[50],
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.slate[200],
        borderStyle: 'dashed',
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    imagePlaceholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    imagePlaceholderText: {
        color: colors.slate[400],
        fontSize: 14,
        fontWeight: '500',
        marginTop: 8,
    },
    descriptionInput: {
        backgroundColor: colors.slate[50],
        borderRadius: 16,
        padding: 16,
        fontSize: 16,
        color: colors.slate[900],
        minHeight: 120,
        textAlignVertical: 'top',
        lineHeight: 24,
    },
    dateInput: {
        backgroundColor: colors.slate[50],
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: colors.slate[900],
        borderWidth: 1,
        borderColor: colors.slate[200],
    },
});
