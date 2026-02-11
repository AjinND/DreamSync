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
    contentBlocks?: ReflectionBlock[];
    // Legacy fields kept for backward compatibility with existing data.
    question?: string;
    answer?: string;
    date: number;
}

export interface ReflectionBlock {
    type: 'text' | 'image' | 'link';
    value: string;
    caption?: string;
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
    journeyId?: string; // ID of the associated journey document
    // Phase 4/5: Social & Collaboration
    isPublic?: boolean;
    likes?: string[];       // User IDs who liked
    likesCount?: number;    // Denormalized count for performance
    commentsCount?: number; // Denormalized comment count
    tags?: string[];        // Interest tags for discovery
    basedOnTemplateId?: string;
    collaborationType?: 'solo' | 'open' | 'group';
    journeyParticipants?: string[]; // User IDs who have access via journey participation
    // Content
    inspirations?: Inspiration[];
    reflections?: Reflection[];
    memories?: Memory[];
    progress?: ProgressEntry[];
    // Budget
    budget?: number;
    expenses?: Expense[];
    // Encryption
    encryptionVersion?: number;
}

export interface UserStats {
    totalDreams: number;
    totalDoing: number;
    totalDone: number;
    streakDays: number;
}

