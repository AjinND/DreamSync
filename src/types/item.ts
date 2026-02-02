export type Phase = 'dream' | 'doing' | 'done';
export type Category = 'travel' | 'skill' | 'adventure' | 'creative' | 'career' | 'health' | 'personal' | 'other';

export interface Inspiration {
    id: string;
    type: 'image' | 'quote' | 'link';
    content: string; // Image URL, Quote text, or Link URL
    caption?: string; // For quotes author or link title
}

export interface Reflection {
    id: string;
    question: string;
    answer: string;
    date: number;
}

export interface Memory {
    id: string;
    imageUrl: string;
    caption: string;
    date: number;
}

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
    // Phase 4 New Fields
    inspirations?: Inspiration[];
    reflections?: Reflection[];
    memories?: Memory[];
}

export interface UserStats {
    totalDreams: number;
    totalDoing: number;
    totalDone: number;
    streakDays: number;
}
