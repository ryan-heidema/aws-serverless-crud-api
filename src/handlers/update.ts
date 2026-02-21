import { getUserId } from '../lib/auth';
import { getItem, updateItem } from '../lib/dynamo';
import { InvalidPathParameterError, NotFoundError, ValidationError } from '../lib/errors';
import { StrictHandler, withErrorHandling } from '../lib/handler';
import { HTTP_STATUS, success } from '../lib/http';
import { parseJsonBody } from '../lib/validation';
import { updateItemSchema } from '../schemas/items';
import { UpdateItemRequest } from '../types';

const updateHandler: StrictHandler = async event => {
  const userId = getUserId(event);
  const id = event.pathParameters?.id;

  if (!id) throw new InvalidPathParameterError('id');

  // Check if item exists for this user
  const existingItem = await getItem(userId, id);
  if (!existingItem) throw new NotFoundError('Item not found');

  const payload = parseJsonBody(event.body);
  const validation = updateItemSchema.safeParse(payload);
  if (!validation.success) throw new ValidationError(validation.error);
  const body = validation.data as UpdateItemRequest;

  const updatedItem = await updateItem(userId, id, body);

  return success(HTTP_STATUS.OK, updatedItem);
};

export const handler = withErrorHandling(updateHandler);
