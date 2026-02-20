import { handler } from "../get";
import { getItem } from "../../lib/dynamo";
import { buildApiEvent, buildContext } from "../../__tests__/utils/api-event";
import { Item } from "../../types";

jest.mock("../../lib/dynamo");

const mockGetItem = jest.mocked(getItem);

const TEST_ITEM: Item = {
  id: "abc-123",
  name: "Test Item",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

describe("get handler", () => {
  it("returns an item by id", async () => {
    mockGetItem.mockResolvedValue(TEST_ITEM);

    const event = buildApiEvent({
      pathParameters: { id: "abc-123" },
    });

    const result: any = await handler(event, buildContext(), jest.fn());

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual(TEST_ITEM);
    expect(mockGetItem).toHaveBeenCalledWith("abc-123");
  });

  it("returns 404 when item does not exist", async () => {
    mockGetItem.mockResolvedValue(undefined);

    const event = buildApiEvent({
      pathParameters: { id: "nonexistent" },
    });

    const result: any = await handler(event, buildContext(), jest.fn());

    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body).error).toBe("Item not found");
  });

  it("returns 400 when id is missing", async () => {
    const event = buildApiEvent({ pathParameters: undefined });

    const result: any = await handler(event, buildContext(), jest.fn());

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toMatch(/id is required/);
    expect(mockGetItem).not.toHaveBeenCalled();
  });

  it("returns 500 when DynamoDB throws", async () => {
    mockGetItem.mockRejectedValue(new Error("DynamoDB error"));

    const event = buildApiEvent({
      pathParameters: { id: "abc-123" },
    });

    const result: any = await handler(event, buildContext(), jest.fn());

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).error).toBe("Internal server error");
  });
});
