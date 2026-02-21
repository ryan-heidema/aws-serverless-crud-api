import { getItem, deleteItem } from "../lib/dynamo";
import { getUserId } from "../lib/auth";
import { InvalidPathParameterError, NotFoundError } from "../lib/errors";
import { noContent } from "../lib/http";
import { StrictHandler, withErrorHandling } from "../lib/handler";

const deleteHandler: StrictHandler = async (event) => {
  const userId = getUserId(event);
  const id = event.pathParameters?.id;

  if (!id) throw new InvalidPathParameterError("id");

  // Check if item exists for this user
  const existingItem = await getItem(userId, id);
  if (!existingItem) throw new NotFoundError("Item not found");

  await deleteItem(userId, id);

  return noContent();
};

export const handler = withErrorHandling(deleteHandler);
