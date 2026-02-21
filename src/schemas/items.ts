import { z } from 'zod';

export const createItemSchema = z.object({
  name: z
    .string({ error: 'name is required and must be a string' })
    .trim()
    .min(1, 'name is required and must be a string'),
});

export const updateItemSchema = z.object({
  name: z
    .string({ error: 'name must be a string' })
    .trim()
    .min(1, 'name is required and must be a string'),
});

export type CreateItemRequest = z.infer<typeof createItemSchema>;
export type UpdateItemRequest = z.infer<typeof updateItemSchema>;
