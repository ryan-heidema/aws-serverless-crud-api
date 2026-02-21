import { buildApiEvent, buildContext } from '../../__tests__/utils/api-event';
import { putItem } from '../../lib/dynamo';
import { handler } from '../create';

jest.mock('../../lib/dynamo');

const mockPutItem = jest.mocked(putItem);

describe('create handler', () => {
  beforeEach(() => {
    mockPutItem.mockResolvedValue();
  });

  it('creates an item and returns 201', async () => {
    const event = buildApiEvent({
      body: JSON.stringify({ name: 'Test Item' }),
    });

    const result: any = await handler(event, buildContext(), jest.fn());

    expect(result.statusCode).toBe(201);

    const body = JSON.parse(result.body);
    expect(body).toEqual({
      userId: 'test-user-id',
      id: expect.any(String),
      name: 'Test Item',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });

    expect(mockPutItem).toHaveBeenCalledTimes(1);
    expect(mockPutItem).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'test-user-id',
        name: 'Test Item',
      })
    );
  });

  it('returns 401 when JWT has no sub', async () => {
    const event = buildApiEvent({
      body: JSON.stringify({ name: 'Test Item' }),
      requestContext: {
        authorizer: { jwt: { claims: {} } },
      },
    } as any);

    const result: any = await handler(event, buildContext(), jest.fn());

    expect(result.statusCode).toBe(401);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('UNAUTHORIZED');
    expect(mockPutItem).not.toHaveBeenCalled();
  });

  it('returns 400 when name is missing', async () => {
    const event = buildApiEvent({ body: JSON.stringify({}) });

    const result: any = await handler(event, buildContext(), jest.fn());

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toBe('Validation failed');
    expect(mockPutItem).not.toHaveBeenCalled();
  });

  it('returns 400 when name is not a string', async () => {
    const event = buildApiEvent({
      body: JSON.stringify({ name: 42 }),
    });

    const result: any = await handler(event, buildContext(), jest.fn());

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(mockPutItem).not.toHaveBeenCalled();
  });

  it('returns 400 when body is empty', async () => {
    const event = buildApiEvent({});

    const result: any = await handler(event, buildContext(), jest.fn());

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(mockPutItem).not.toHaveBeenCalled();
  });

  it('returns 500 when DynamoDB throws', async () => {
    mockPutItem.mockRejectedValue(new Error('DynamoDB error'));

    const event = buildApiEvent({
      body: JSON.stringify({ name: 'Test Item' }),
    });

    const result: any = await handler(event, buildContext(), jest.fn());

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).toBe('Internal server error');
  });
});
