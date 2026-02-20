/**
 * Simple Item type for CRUD API
 */
export interface Item {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateItemRequest {
  name: string;
}

export interface UpdateItemRequest {
  name?: string;
}
