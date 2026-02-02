/**
 * DreamSync - Add/Edit Dream Screen
 * Uses DreamForm component for creating and editing dreams
 */

import { auth } from '@/firebaseConfig';
import { DreamForm } from '@/src/components/dream';
import { Header } from '@/src/components/shared';
import { IconButton } from '@/src/components/ui';
import { StorageService } from '@/src/services/storage';
import { useBucketStore } from '@/src/store/useBucketStore';
import { useTheme } from '@/src/theme';
import { Category, Phase } from '@/src/types/item';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AddDreamScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { id } = params;
    const isEditing = !!id;

    const { colors, isDark } = useTheme();
    const { addItem, updateItem, items } = useBucketStore();

    const [loading, setLoading] = useState(false);
    const [initialValues, setInitialValues] = useState<{
        title: string;
        description: string;
        category: Category;
        phase: Phase;
        imageUri: string | null;
        targetDate: string;
    } | undefined>(undefined);

    useEffect(() => {
        if (isEditing && typeof id === 'string') {
            const existingItem = items.find(i => i.id === id);
            if (existingItem) {
                setInitialValues({
                    title: existingItem.title,
                    description: existingItem.description || '',
                    category: existingItem.category,
                    phase: existingItem.phase,
                    imageUri: existingItem.mainImage || null,
                    targetDate: existingItem.targetDate
                        ? new Date(existingItem.targetDate).toISOString().split('T')[0]
                        : '',
                });
            }
        }
    }, [id, items]);

    const handleSubmit = async (values: {
        title: string;
        description: string;
        category: Category;
        phase: Phase;
        imageUri: string | null;
        targetDate: string;
    }) => {
        setLoading(true);

        try {
            const userId = auth.currentUser?.uid;
            if (!userId) {
                Alert.alert('Error', 'Please log in to save your dream');
                setLoading(false);
                return;
            }

            let uploadedImageUrl = values.imageUri;

            // Upload image if it's a local file
            if (values.imageUri && values.imageUri.startsWith('file://')) {
                try {
                    const imagePath = `dreams/${userId}/${isEditing && typeof id === 'string' ? id : `new-${Date.now()}`}/cover.jpg`;
                    uploadedImageUrl = await StorageService.uploadImage(
                        values.imageUri,
                        imagePath
                    );
                } catch (uploadError) {
                    console.error('Image upload failed:', uploadError);
                    // Continue without image
                    uploadedImageUrl = null;
                }
            }

            const dreamData = {
                title: values.title,
                description: values.description,
                category: values.category,
                phase: values.phase,
                mainImage: uploadedImageUrl || undefined,
                targetDate: values.targetDate ? new Date(values.targetDate).getTime() : undefined,
            };

            if (isEditing && typeof id === 'string') {
                await updateItem(id, dreamData);
            } else {
                await addItem(dreamData);
            }

            router.back();
        } catch (error) {
            console.error('Failed to save dream:', error);
            Alert.alert('Error', 'Failed to save your dream. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (loading) return;
        router.back();
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <StatusBar style={isDark ? 'light' : 'dark'} />

            <Header
                title={isEditing ? 'Edit Dream' : 'New Dream'}
                leftAction={
                    <IconButton
                        icon={ChevronLeft}
                        onPress={handleClose}
                        variant="ghost"
                    />
                }
                rightAction={
                    <IconButton
                        icon={X}
                        onPress={handleClose}
                        variant="ghost"
                    />
                }
            />

            <DreamForm
                initialValues={initialValues}
                onSubmit={handleSubmit}
                isEditing={isEditing}
                isLoading={loading}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
