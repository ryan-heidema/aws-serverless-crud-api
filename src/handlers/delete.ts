import { getItem, deleteItem } from "../lib/dynamo";
import { InvalidPathParameterError, NotFoundError } from "../lib/errors";
import { noContent } from "../lib/http";
import { StrictHandler, withErrorHandling } from "../lib/handler";

const deleteHandler: StrictHandler = async (event) => {
  const id = event.pathParameters?.id;

  if (!id) throw new InvalidPathParameterError("id");

  // Check if item exists
  const existingItem = await getItem(id);
  if (!existingItem) throw new NotFoundError("Item not found");

  await deleteItem(id);

  return noContent();
};

export const handler = withErrorHandling(deleteHandler);
