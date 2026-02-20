import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { getItem, updateItem } from "../lib/dynamo";
import { UpdateItemRequest } from "../types";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const id = event.pathParameters?.id;

    if (!id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "id is required" }),
      };
    }

    // Check if item exists
    const existingItem = await getItem(id);
    if (!existingItem) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Item not found" }),
      };
    }

    const body = JSON.parse(event.body ?? "{}") as UpdateItemRequest;

    if (body.name !== undefined && typeof body.name !== "string") {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "name must be a string" }),
      };
    }

    const updatedItem = await updateItem(id, body);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatedItem),
    };
  } catch (error) {
    console.error("Error updating item:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
