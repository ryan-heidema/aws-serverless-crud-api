import { getUserId } from '../lib/auth';
import { listItemsByUserId } from '../lib/dynamo';
import { StrictHandler, withErrorHandling } from '../lib/handler';
import { HTTP_STATUS, success } from '../lib/http';

const listHandler: StrictHandler = async event => {
  const userId = getUserId(event);

  const items = await listItemsByUserId(userId);

  return success(HTTP_STATUS.OK, { items });
};

export const handler = withErrorHandling(listHandler);
