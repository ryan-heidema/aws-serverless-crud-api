/**
 * Simple Item type for CRUD API
 */
export interface Item {
  userId: string;
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export type { CreateItemRequest, UpdateItemRequest } from "./schemas/items";
