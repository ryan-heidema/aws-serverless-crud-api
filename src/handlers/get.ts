import { getItem } from "../lib/dynamo";
import { InvalidPathParameterError, NotFoundError } from "../lib/errors";
import { HTTP_STATUS, success } from "../lib/http";
import { StrictHandler, withErrorHandling } from "../lib/handler";

const getHandler: StrictHandler = async (event) => {
  const id = event.pathParameters?.id;

  if (!id) throw new InvalidPathParameterError("id");

  const item = await getItem(id);

  if (!item) throw new NotFoundError("Item not found");

  return success(HTTP_STATUS.OK, item);
};

export const handler = withErrorHandling(getHandler);
