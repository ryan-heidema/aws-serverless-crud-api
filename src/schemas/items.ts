import { z } from 'zod';

/** Max length for item name */
export const ITEM_NAME_MAX_LENGTH = 256;

/** Removes control characters and null bytes from a string */
function sanitizeItemName(value: string): string {
  return value.replace(/[\x00-\x1F\x7F]/g, '');
}

const nameSchema = z
  .string({ message: 'name is required and must be a string' })
  .trim()
  .transform(sanitizeItemName)
  .pipe(
    z
      .string()
      .min(1, 'name is required and must be a string')
      .max(ITEM_NAME_MAX_LENGTH, `name must be at most ${ITEM_NAME_MAX_LENGTH} characters`)
  );

export const createItemSchema = z.object({
  name: nameSchema,
});

export const updateItemSchema = z.object({
  name: nameSchema,
});

export type CreateItemRequest = z.infer<typeof createItemSchema>;
export type UpdateItemRequest = z.infer<typeof updateItemSchema>;
