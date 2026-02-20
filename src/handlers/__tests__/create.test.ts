import { handler } from "../create";
import { putItem } from "../../lib/dynamo";
import { buildApiEvent, buildContext } from "../../__tests__/utils/api-event";

jest.mock("../../lib/dynamo");

const mockPutItem = jest.mocked(putItem);

describe("create handler", () => {
  beforeEach(() => {
    mockPutItem.mockResolvedValue();
  });

  it("creates an item and returns 201", async () => {
    const event = buildApiEvent({
      body: JSON.stringify({ name: "Test Item" }),
    });

    const result: any = await handler(event, buildContext(), jest.fn());

    expect(result.statusCode).toBe(201);

    const body = JSON.parse(result.body);
    expect(body).toEqual({
      id: expect.any(String),
      name: "Test Item",
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });

    expect(mockPutItem).toHaveBeenCalledTimes(1);
    expect(mockPutItem).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Test Item" })
    );
  });

  it("returns 400 when name is missing", async () => {
    const event = buildApiEvent({ body: JSON.stringify({}) });

    const result: any = await handler(event, buildContext(), jest.fn());

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toMatch(/name is required/);
    expect(mockPutItem).not.toHaveBeenCalled();
  });

  it("returns 400 when name is not a string", async () => {
    const event = buildApiEvent({
      body: JSON.stringify({ name: 42 }),
    });

    const result: any = await handler(event, buildContext(), jest.fn());

    expect(result.statusCode).toBe(400);
    expect(mockPutItem).not.toHaveBeenCalled();
  });

  it("returns 400 when body is empty", async () => {
    const event = buildApiEvent({ body: undefined });

    const result: any = await handler(event, buildContext(), jest.fn());

    expect(result.statusCode).toBe(400);
    expect(mockPutItem).not.toHaveBeenCalled();
  });

  it("returns 500 when DynamoDB throws", async () => {
    mockPutItem.mockRejectedValue(new Error("DynamoDB error"));

    const event = buildApiEvent({
      body: JSON.stringify({ name: "Test Item" }),
    });

    const result: any = await handler(event, buildContext(), jest.fn());

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).error).toBe("Internal server error");
  });
});
