import { handler } from "../delete";
import { getItem, deleteItem } from "../../lib/dynamo";
import { buildApiEvent, buildContext } from "../../__tests__/utils/api-event";
import { Item } from "../../types";

jest.mock("../../lib/dynamo");

const mockGetItem = jest.mocked(getItem);
const mockDeleteItem = jest.mocked(deleteItem);

const EXISTING_ITEM: Item = {
  id: "abc-123",
  name: "Test Item",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

describe("delete handler", () => {
  it("deletes an existing item and returns 204", async () => {
    mockGetItem.mockResolvedValue(EXISTING_ITEM);
    mockDeleteItem.mockResolvedValue();

    const event = buildApiEvent({
      pathParameters: { id: "abc-123" },
    });

    const result: any = await handler(event, buildContext(), jest.fn());

    expect(result.statusCode).toBe(204);
    expect(result.body).toBe("");
    expect(mockDeleteItem).toHaveBeenCalledWith("abc-123");
  });

  it("returns 404 when item does not exist", async () => {
    mockGetItem.mockResolvedValue(undefined);

    const event = buildApiEvent({
      pathParameters: { id: "nonexistent" },
    });

    const result: any = await handler(event, buildContext(), jest.fn());

    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body).error).toBe("Item not found");
    expect(mockDeleteItem).not.toHaveBeenCalled();
  });

  it("returns 400 when id is missing", async () => {
    const event = buildApiEvent({ pathParameters: undefined });

    const result: any = await handler(event, buildContext(), jest.fn());

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toMatch(/id is required/);
  });

  it("returns 500 when DynamoDB throws", async () => {
    mockGetItem.mockResolvedValue(EXISTING_ITEM);
    mockDeleteItem.mockRejectedValue(new Error("DynamoDB error"));

    const event = buildApiEvent({
      pathParameters: { id: "abc-123" },
    });

    const result: any = await handler(event, buildContext(), jest.fn());

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).error).toBe("Internal server error");
  });
});
