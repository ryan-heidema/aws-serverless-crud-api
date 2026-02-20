import { putItem } from "../lib/dynamo";
import { randomUUID } from "crypto";
import { Item } from "../types";
import { ValidationError } from "../lib/errors";
import { parseJsonBody } from "../lib/validation";
import { createItemSchema } from "../schemas/items";
import { HTTP_STATUS, success } from "../lib/http";
import { StrictHandler, withErrorHandling } from "../lib/handler";

const createHandler: StrictHandler = async (event) => {
  const payload = parseJsonBody(event.body);
  const validation = createItemSchema.safeParse(payload);
  if (!validation.success) throw new ValidationError(validation.error);

  const now = new Date().toISOString();
  const item: Item = {
    id: randomUUID(),
    name: validation.data.name,
    createdAt: now,
    updatedAt: now,
  };

  await putItem(item);

  return success(HTTP_STATUS.CREATED, item);
};

export const handler = withErrorHandling(createHandler);
