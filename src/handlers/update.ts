import { getItem, updateItem } from "../lib/dynamo";
import { UpdateItemRequest } from "../types";
import {
  InvalidPathParameterError,
  NotFoundError,
  ValidationError,
} from "../lib/errors";
import { parseJsonBody } from "../lib/validation";
import { updateItemSchema } from "../schemas/items";
import { HTTP_STATUS, success } from "../lib/http";
import { StrictHandler, withErrorHandling } from "../lib/handler";

const updateHandler: StrictHandler = async (event) => {
  const id = event.pathParameters?.id;

  if (!id) throw new InvalidPathParameterError("id");

  // Check if item exists
  const existingItem = await getItem(id);
  if (!existingItem) throw new NotFoundError("Item not found");

  const payload = parseJsonBody(event.body);
  const validation = updateItemSchema.safeParse(payload);
  if (!validation.success) throw new ValidationError(validation.error);
  const body = validation.data as UpdateItemRequest;

  const updatedItem = await updateItem(id, body);

  return success(HTTP_STATUS.OK, updatedItem);
};

export const handler = withErrorHandling(updateHandler);
