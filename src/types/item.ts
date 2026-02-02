export type Phase = 'dream' | 'doing' | 'done';
export type Category = 'travel' | 'skill' | 'adventure' | 'creative' | 'career' | 'health' | 'personal' | 'other';

export interface BucketItem {
    id: string;
    userId: string;
    title: string;
    description?: string;
    phase: Phase;
    category: Category;
    targetDate?: number; // Timestamp
    createdAt: number;
    completedAt?: number;
    mainImage?: string;
    images?: string[];
    checklist?: {
        id: string;
        text: string;
        completed: boolean;
    }[];
}

export interface UserStats {
    totalDreams: number;
    totalDoing: number;
    totalDone: number;
    streakDays: number;
}
