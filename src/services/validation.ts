/**
 * Input Validation Schemas for DreamSync
 *
 * Uses Zod for schema-based validation at system boundaries.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Auth Schemas
// ---------------------------------------------------------------------------

export const loginSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const signupSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
});

// ---------------------------------------------------------------------------
// Dream Schemas
// ---------------------------------------------------------------------------

export const dreamSchema = z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
    description: z.string().max(2000, 'Description is too long').optional(),
    category: z.enum([
        'travel', 'skill', 'adventure', 'creative',
        'career', 'health', 'personal', 'other',
    ]),
    phase: z.enum(['dream', 'doing', 'done']).optional(),
    location: z.string().max(200, 'Location is too long').optional(),
    budget: z.number().min(0, 'Budget cannot be negative').optional(),
    tags: z.array(z.string().max(50)).max(10, 'Maximum 10 tags').optional(),
});

// ---------------------------------------------------------------------------
// Message Schema
// ---------------------------------------------------------------------------

export const messageSchema = z.object({
    text: z.string().max(5000, 'Message is too long (max 5000 characters)').optional(),
    mediaUrl: z.string().url('Please provide a valid media URL').optional(),
    type: z.enum(['text', 'image', 'video', 'system']).optional(),
}).superRefine((data, ctx) => {
    const type = data.type ?? 'text';
    const trimmed = (data.text ?? '').trim();

    if (type === 'text' && trimmed.length === 0) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['text'],
            message: 'Message cannot be empty',
        });
    }

    if (type === 'image' && (!data.mediaUrl || data.mediaUrl.trim().length === 0)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['mediaUrl'],
            message: 'Image message must include media URL',
        });
    }
});

// ---------------------------------------------------------------------------
// Profile Schema
// ---------------------------------------------------------------------------

export const profileUpdateSchema = z.object({
    displayName: z
        .string()
        .min(1, 'Display name is required')
        .max(100, 'Display name is too long')
        .optional(),
    bio: z.string().max(500, 'Bio is too long (max 500 characters)').optional(),
});

// ---------------------------------------------------------------------------
// Expense Schema
// ---------------------------------------------------------------------------

export const expenseSchema = z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
    amount: z.number().min(0, 'Amount cannot be negative').max(999_999_999, 'Amount is too large'),
    category: z.enum([
        'transport', 'accommodation', 'food',
        'activities', 'gear', 'other',
    ]),
});

// ---------------------------------------------------------------------------
// Inspiration / Progress / Reflection Schemas
// ---------------------------------------------------------------------------

const urlSchema = z.string().url('Please enter a valid URL');

export const inspirationSchema = z.object({
    type: z.enum(['image', 'quote', 'link']),
    content: z.string().min(1, 'Content is required').max(5000, 'Content is too long'),
    caption: z.string().max(200, 'Caption is too long').optional(),
}).superRefine((data, ctx) => {
    if ((data.type === 'image' || data.type === 'link')) {
        const urlCheck = urlSchema.safeParse(data.content);
        if (!urlCheck.success) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['content'],
                message: 'Please enter a valid URL',
            });
        }
    }
});

export const progressSchema = z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
    description: z.string().max(2000, 'Description is too long').optional(),
    imageUrl: urlSchema.optional(),
    date: z.number().int().positive(),
});

export const reflectionBlockSchema = z.object({
    type: z.enum(['text', 'image', 'link']),
    value: z.string().min(1, 'Value is required').max(5000, 'Value is too long'),
    caption: z.string().max(200, 'Caption is too long').optional(),
}).superRefine((block, ctx) => {
    if (block.type === 'image' || block.type === 'link') {
        const urlCheck = urlSchema.safeParse(block.value);
        if (!urlCheck.success) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['value'],
                message: 'Please enter a valid URL',
            });
        }
    }
});

export const reflectionSchema = z.object({
    contentBlocks: z.array(reflectionBlockSchema).min(1, 'At least one reflection block is required').max(10, 'Maximum 10 blocks allowed'),
    date: z.number().int().positive(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Validate data against a schema. Throws ZodError on failure. */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
    return schema.parse(data);
}

/** Validate data against a schema. Returns { success, data, error } without throwing. */
export function safeValidate<T>(
    schema: z.ZodSchema<T>,
    data: unknown,
): { success: true; data: T } | { success: false; error: string } {
    const result = schema.safeParse(data);

    if (result.success) {
        return { success: true, data: result.data };
    }

    // Concatenate all error messages
    const errorMessage = result.error.issues
        .map((issue: z.ZodIssue) => issue.message)
        .join('. ');

    return { success: false, error: errorMessage };
}
