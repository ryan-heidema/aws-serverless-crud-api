import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { Item } from "../types";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

function getTableName(): string {
  const name = process.env.TABLE_NAME;
  if (!name) throw new Error("TABLE_NAME environment variable is not set");
  return name;
}

export const putItem = async (item: Item): Promise<void> => {
  await docClient.send(
    new PutCommand({
      TableName: getTableName(),
      Item: item,
    })
  );
};

export const getItem = async (id: string): Promise<Item | undefined> => {
  const result = await docClient.send(
    new GetCommand({
      TableName: getTableName(),
      Key: { id },
    })
  );
  return result.Item as Item | undefined;
};

export const updateItem = async (
  id: string,
  updates: Partial<Item>
): Promise<Item> => {
  const tableName = getTableName();
  const updateExpression: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, any> = {};

  if (updates.name !== undefined) {
    updateExpression.push("#name = :name");
    expressionAttributeNames["#name"] = "name";
    expressionAttributeValues[":name"] = updates.name;
  }

  updateExpression.push("updatedAt = :updatedAt");
  expressionAttributeValues[":updatedAt"] = new Date().toISOString();

  const result = await docClient.send(
    new UpdateCommand({
      TableName: tableName,
      Key: { id },
      UpdateExpression: `SET ${updateExpression.join(", ")}`,
      ExpressionAttributeNames:
        Object.keys(expressionAttributeNames).length > 0
          ? expressionAttributeNames
          : undefined,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "ALL_NEW",
    })
  );

  return result.Attributes as Item;
};

export const deleteItem = async (id: string): Promise<void> => {
  await docClient.send(
    new DeleteCommand({
      TableName: getTableName(),
      Key: { id },
    })
  );
};
