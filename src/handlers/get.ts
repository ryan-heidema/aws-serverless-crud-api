import { getUserId } from '../lib/auth';
import { getItem } from '../lib/dynamo';
import { InvalidPathParameterError, NotFoundError } from '../lib/errors';
import { StrictHandler, withErrorHandling } from '../lib/handler';
import { HTTP_STATUS, success } from '../lib/http';

const getHandler: StrictHandler = async event => {
  const userId = getUserId(event);
  const id = event.pathParameters?.id;

  if (!id) throw new InvalidPathParameterError('id');

  const item = await getItem(userId, id);

  if (!item) throw new NotFoundError('Item not found');

  return success(HTTP_STATUS.OK, item);
};

export const handler = withErrorHandling(getHandler);
