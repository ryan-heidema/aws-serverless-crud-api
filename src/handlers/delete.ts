import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { getItem, deleteItem } from "../lib/dynamo";

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

    await deleteItem(id);

    return {
      statusCode: 204,
      body: "",
    };
  } catch (error) {
    console.error("Error deleting item:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
