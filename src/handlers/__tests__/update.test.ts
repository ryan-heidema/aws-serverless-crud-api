import { buildApiEvent, buildContext } from '../../__tests__/utils/api-event';
import { getItem, updateItem } from '../../lib/dynamo';
import { ITEM_NAME_MAX_LENGTH } from '../../schemas/items';
import { Item } from '../../types';
import { handler } from '../update';

jest.mock('../../lib/dynamo');

const mockGetItem = jest.mocked(getItem);
const mockUpdateItem = jest.mocked(updateItem);

const EXISTING_ITEM: Item = {
  userId: 'test-user-id',
  id: 'abc-123',
  name: 'Old Name',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('update handler', () => {
  it('updates an existing item', async () => {
    const updatedItem: Item = {
      ...EXISTING_ITEM,
      name: 'New Name',
      updatedAt: '2024-06-01T00:00:00.000Z',
    };
    mockGetItem.mockResolvedValue(EXISTING_ITEM);
    mockUpdateItem.mockResolvedValue(updatedItem);

    const event = buildApiEvent({
      pathParameters: { id: 'abc-123' },
      body: JSON.stringify({ name: 'New Name' }),
    });

    const result: any = await handler(event, buildContext(), jest.fn());

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.statusCode).toBe(200);
    expect(body.data).toEqual(updatedItem);
    expect(mockUpdateItem).toHaveBeenCalledWith('test-user-id', 'abc-123', {
      name: 'New Name',
    });
  });

  it('returns 404 when item does not exist', async () => {
    mockGetItem.mockResolvedValue(undefined);

    const event = buildApiEvent({
      pathParameters: { id: 'nonexistent' },
      body: JSON.stringify({ name: 'New Name' }),
    });

    const result: any = await handler(event, buildContext(), jest.fn());

    expect(result.statusCode).toBe(404);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toBe('Item not found');
    expect(mockUpdateItem).not.toHaveBeenCalled();
  });

  it('returns 400 when id is missing', async () => {
    const event = buildApiEvent({
      body: JSON.stringify({ name: 'New Name' }),
    });

    const result: any = await handler(event, buildContext(), jest.fn());

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INVALID_PATH_PARAMETER');
    expect(body.error.message).toMatch(/id/);
  });

  it('returns 400 when name is not a string', async () => {
    mockGetItem.mockResolvedValue(EXISTING_ITEM);

    const event = buildApiEvent({
      pathParameters: { id: 'abc-123' },
      body: JSON.stringify({ name: 123 }),
    });

    const result: any = await handler(event, buildContext(), jest.fn());

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(mockUpdateItem).not.toHaveBeenCalled();
  });

  it('returns 400 when name exceeds max length', async () => {
    mockGetItem.mockResolvedValue(EXISTING_ITEM);
    const longName = 'x'.repeat(ITEM_NAME_MAX_LENGTH + 1);
    const event = buildApiEvent({
      pathParameters: { id: 'abc-123' },
      body: JSON.stringify({ name: longName }),
    });

    const result: any = await handler(event, buildContext(), jest.fn());

    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'name',
          message: `name must be at most ${ITEM_NAME_MAX_LENGTH} characters`,
        }),
      ])
    );
    expect(mockUpdateItem).not.toHaveBeenCalled();
  });

  it('sanitizes control characters from name and updates with cleaned value', async () => {
    mockGetItem.mockResolvedValue(EXISTING_ITEM);
    mockUpdateItem.mockResolvedValue({
      ...EXISTING_ITEM,
      name: 'CleanName',
      updatedAt: '2024-06-01T00:00:00.000Z',
    });
    const event = buildApiEvent({
      pathParameters: { id: 'abc-123' },
      body: JSON.stringify({ name: 'Clean\x00Name\x7F' }),
    });

    const result: any = await handler(event, buildContext(), jest.fn());

    expect(result.statusCode).toBe(200);
    expect(mockUpdateItem).toHaveBeenCalledWith('test-user-id', 'abc-123', {
      name: 'CleanName',
    });
  });

  it('returns 500 when DynamoDB throws', async () => {
    mockGetItem.mockResolvedValue(EXISTING_ITEM);
    mockUpdateItem.mockRejectedValue(new Error('DynamoDB error'));

    const event = buildApiEvent({
      pathParameters: { id: 'abc-123' },
      body: JSON.stringify({ name: 'New Name' }),
    });

    const result: any = await handler(event, buildContext(), jest.fn());

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).toBe('Internal server error');
  });
});
