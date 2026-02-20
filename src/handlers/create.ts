import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { putItem } from "../lib/dynamo";
import { randomUUID } from "crypto";
import { CreateItemRequest, Item } from "../types";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const body = JSON.parse(event.body ?? "{}") as CreateItemRequest;

    if (!body.name || typeof body.name !== "string") {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "name is required and must be a string" }),
      };
    }

    const item: Item = {
      id: randomUUID(),
      name: body.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await putItem(item);

    return {
      statusCode: 201,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(item),
    };
  } catch (error) {
    console.error("Error creating item:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
