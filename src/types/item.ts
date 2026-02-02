export type Phase = 'dream' | 'doing' | 'done';
export type Category = 'travel' | 'skill' | 'adventure' | 'creative' | 'career' | 'health' | 'personal' | 'other';

export interface Inspiration {
    id: string;
    type: 'image' | 'quote' | 'link';
    content: string;
    caption?: string;
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

export interface ProgressEntry {
    id: string;
    title: string;
    description?: string;
    imageUrl?: string;
    date: number;
}

export interface Expense {
    id: string;
    title: string;
    amount: number;
    category: 'transport' | 'accommodation' | 'food' | 'activities' | 'gear' | 'other';
    date: number;
}

export interface BucketItem {
    id: string;
    userId: string;
    title: string;
    description?: string;
    phase: Phase;
    category: Category;
    targetDate?: number;
    createdAt: number;
    completedAt?: number;
    mainImage?: string;
    images?: string[];
    // Location & Social
    location?: string;
    with?: string[];
    inspiredCount?: number;
    // Content
    inspirations?: Inspiration[];
    reflections?: Reflection[];
    memories?: Memory[];
    progress?: ProgressEntry[];
    // Budget
    budget?: number;
    expenses?: Expense[];
}

export interface UserStats {
    totalDreams: number;
    totalDoing: number;
    totalDone: number;
    streakDays: number;
}

