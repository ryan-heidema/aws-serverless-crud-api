import { getUserId } from '../lib/auth';
import { deleteItem, getItem } from '../lib/dynamo';
import { InvalidPathParameterError, NotFoundError } from '../lib/errors';
import { StrictHandler, withErrorHandling } from '../lib/handler';
import { noContent } from '../lib/http';
import { getRequestLogContext, log } from '../lib/logger';
import { recordItemMetric } from '../lib/metrics';

const deleteHandler: StrictHandler = async (event, context) => {
  const userId = getUserId(event);
  const id = event.pathParameters?.id;

  if (!id) throw new InvalidPathParameterError('id');

  // Check if item exists for this user
  const existingItem = await getItem(userId, id);
  if (!existingItem) throw new NotFoundError('Item not found');

  await deleteItem(userId, id);

  const { requestId } = getRequestLogContext(event, context);
  log('info', 'Item deleted', {
    requestId,
    userId,
    action: 'item_deleted',
    itemId: id,
  });
  recordItemMetric('deleted');

  return noContent();
};

export const handler = withErrorHandling(deleteHandler);
