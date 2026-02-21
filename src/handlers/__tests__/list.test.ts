import { handler } from "../list";
import { listItemsByUserId } from "../../lib/dynamo";
import { buildApiEvent, buildContext } from "../../__tests__/utils/api-event";
import { Item } from "../../types";

jest.mock("../../lib/dynamo");

const mockListItemsByUserId = jest.mocked(listItemsByUserId);

const TEST_ITEMS: Item[] = [
  {
    userId: "test-user-id",
    id: "id-1",
    name: "First",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  },
  {
    userId: "test-user-id",
    id: "id-2",
    name: "Second",
    createdAt: "2024-01-02T00:00:00.000Z",
    updatedAt: "2024-01-02T00:00:00.000Z",
  },
];

describe("list handler", () => {
  it("returns all items for the authenticated user", async () => {
    mockListItemsByUserId.mockResolvedValue(TEST_ITEMS);

    const event = buildApiEvent({});

    const result: any = await handler(event, buildContext(), jest.fn());

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ items: TEST_ITEMS });
    expect(mockListItemsByUserId).toHaveBeenCalledWith("test-user-id");
  });

  it("returns empty array when user has no items", async () => {
    mockListItemsByUserId.mockResolvedValue([]);

    const event = buildApiEvent({});

    const result: any = await handler(event, buildContext(), jest.fn());

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ items: [] });
  });

  it("returns 401 when JWT has no sub", async () => {
    const event = buildApiEvent({
      requestContext: {
        authorizer: { jwt: { claims: {} } },
      },
    } as any);

    const result: any = await handler(event, buildContext(), jest.fn());

    expect(result.statusCode).toBe(401);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(mockListItemsByUserId).not.toHaveBeenCalled();
  });

  it("returns 500 when DynamoDB throws", async () => {
    mockListItemsByUserId.mockRejectedValue(new Error("DynamoDB error"));

    const event = buildApiEvent({});

    const result: any = await handler(event, buildContext(), jest.fn());

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe("INTERNAL_ERROR");
  });
});
