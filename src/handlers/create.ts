import { randomUUID } from 'crypto';

import { getUserId } from '../lib/auth';
import { putItem } from '../lib/dynamo';
import { ValidationError } from '../lib/errors';
import { StrictHandler, withErrorHandling } from '../lib/handler';
import { HTTP_STATUS, success } from '../lib/http';
import { parseJsonBody } from '../lib/validation';
import { createItemSchema } from '../schemas/items';
import { Item } from '../types';

const createHandler: StrictHandler = async event => {
  const userId = getUserId(event);

  const payload = parseJsonBody(event.body);
  const validation = createItemSchema.safeParse(payload);
  if (!validation.success) throw new ValidationError(validation.error);

  const now = new Date().toISOString();
  const item: Item = {
    userId,
    id: randomUUID(),
    name: validation.data.name,
    createdAt: now,
    updatedAt: now,
  };

  await putItem(item);

  return success(HTTP_STATUS.CREATED, item);
};

export const handler = withErrorHandling(createHandler);
