import { z } from 'zod';

// User schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  remember: z.boolean().optional(),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const newPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

// Signal schemas
export const createSignalSchema = z.object({
  type: z.enum(['IMAGE', 'LINK', 'NOTE', 'SONG', 'CODE', 'SCREENSHOT', 'AUDIO', 'DOCUMENT']),
  title: z.string().min(1).max(200).optional(),
  content: z.string().max(10000).optional(),
  description: z.string().max(2000).optional(),
  sourceUrl: z.string().url().optional().or(z.literal('')),
  tags: z.array(z.string().max(50)).max(20).optional(),
  frequencyId: z.string().optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE', 'UNLISTED', 'SELECTED_USERS', 'COLLABORATORS_ONLY']).optional(),
  selectedUserIds: z.array(z.string()).optional(),
  ghostMode: z.enum(['ONE_HOUR', 'ONE_DAY', 'ONE_WEEK', 'CUSTOM_DATE', 'OPEN_ONCE']).optional(),
  ghostModeExpiresAt: z.string().datetime().optional(),
});

export const updateSignalSchema = createSignalSchema.partial();

// Frequency schemas
export const createFrequencySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
});

export const updateFrequencySchema = createFrequencySchema.partial();

// Comment schemas
export const createCommentSchema = z.object({
  content: z.string().min(1).max(5000),
  parentId: z.string().optional(),
});

// Message schemas
export const createMessageSchema = z.object({
  receiverId: z.string(),
  content: z.string().min(1).max(5000),
});

// Research trail schemas
export const createTrailSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  visibility: z.enum(['PRIVATE', 'SHARED', 'PUBLIC']).optional(),
});

export const updateTrailSchema = createTrailSchema.partial();

export const createTrailNodeSchema = z.object({
  type: z.enum(['SIGNAL', 'NOTE', 'DIVIDER']),
  signalId: z.string().optional(),
  title: z.string().max(100).optional(),
  content: z.string().max(5000).optional(),
  positionX: z.number().optional(),
  positionY: z.number().optional(),
  order: z.number().optional(),
});

export const updateTrailNodeSchema = z.object({
  positionX: z.number().optional(),
  positionY: z.number().optional(),
  title: z.string().max(100).optional(),
  content: z.string().max(5000).optional(),
  order: z.number().optional(),
});

export const createTrailConnectionSchema = z.object({
  sourceId: z.string(),
  targetId: z.string(),
  label: z.string().max(100).optional(),
});

// Search schemas
export const searchSchema = z.object({
  q: z.string().min(1).max(200),
  type: z.enum(['SIGNALS', 'FREQUENCIES', 'USERS', 'TRAILS']).optional(),
  signalType: z.enum(['IMAGE', 'LINK', 'NOTE', 'SONG', 'CODE', 'SCREENSHOT', 'AUDIO', 'DOCUMENT']).optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE', 'UNLISTED']).optional(),
  sortBy: z.enum(['RELEVANCE', 'NEWEST', 'POPULAR', 'TRENDING']).optional(),
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(50).optional(),
});

// User profile schemas
export const updateProfileSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  displayName: z.string().min(1).max(50).optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
  bannerUrl: z.string().url().optional().or(z.literal('')),
});

export const updateSettingsSchema = z.object({
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  showActivityStatus: z.boolean().optional(),
  showOnlineStatus: z.boolean().optional(),
  defaultSignalVisibility: z.enum(['PUBLIC', 'PRIVATE', 'UNLISTED']).optional(),
  defaultFrequencyVisibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
  theme: z.string().optional(),
  language: z.string().optional(),
  timezone: z.string().optional(),
});

// Report schema
export const reportSchema = z.object({
  reportedId: z.string(),
  reason: z.string().min(1),
  details: z.string().max(2000).optional(),
});

// Internal environment schemas
export const internalEnvModeSchema = z.object({
  mode: z.enum(['STRICT', 'COMPATIBILITY', 'LEGACY']),
});