import { z } from 'zod';

export const themeSchema = z.enum(['light', 'dark', 'system']);
export const viewSchema = z.enum(['cards', 'table']);

export const userPreferencesSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  theme: themeSchema,
  sidebarCollapsed: z.boolean(),
  defaultView: viewSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const createPreferencesDtoSchema = userPreferencesSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updatePreferencesDtoSchema = userPreferencesSchema.omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export type UserPreferencesSchema = z.infer<typeof userPreferencesSchema>;
export type CreatePreferencesDtoSchema = z.infer<typeof createPreferencesDtoSchema>;
export type UpdatePreferencesDtoSchema = z.infer<typeof updatePreferencesDtoSchema>;
