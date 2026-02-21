import {
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
} from '@aws-sdk/client-cognito-identity-provider';

const API_URL = process.env.API_URL;
const region = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION;
const userPoolId = process.env.COGNITO_USER_POOL_ID;
const clientId = process.env.COGNITO_CLIENT_ID;

const cognito =
  region && userPoolId && clientId ? new CognitoIdentityProviderClient({ region }) : null;

/** Creates a Cognito user and returns their IdToken for API requests. */
async function createTestUserAndGetToken(
  emailPrefix: string,
  password: string = 'Password123!'
): Promise<string> {
  if (!cognito || !userPoolId || !clientId) {
    throw new Error(
      'COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID, and AWS_REGION are required for authenticated integration tests.'
    );
  }

  const email = `${emailPrefix}-${Date.now()}@example.com`;

  await cognito.send(
    new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: email,
      TemporaryPassword: password,
      MessageAction: 'SUPPRESS',
    })
  );

  await cognito.send(
    new AdminSetUserPasswordCommand({
      UserPoolId: userPoolId,
      Username: email,
      Password: password,
      Permanent: true,
    })
  );

  const auth = await cognito.send(
    new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: clientId,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    })
  );

  const token = auth.AuthenticationResult?.IdToken;
  if (!token) throw new Error('Failed to obtain IdToken from Cognito');
  return token;
}

type Item = {
  userId?: string;
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
};

type JsonValue = Record<string, unknown> | unknown[] | string | number | boolean | null;

async function request(
  path: string,
  token: string,
  init?: RequestInit
): Promise<{ status: number; body: JsonValue | null }> {
  if (!API_URL) throw new Error('API_URL is required for integration tests.');

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...(init?.headers as Record<string, string> | undefined),
  };

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
  });

  const text = await response.text();

  if (!text) {
    return { status: response.status, body: null };
  }

  try {
    return { status: response.status, body: JSON.parse(text) as JsonValue };
  } catch {
    return { status: response.status, body: text as JsonValue };
  }
}

describe('items integration (real AWS + Cognito)', () => {
  let userAToken: string;
  let userBToken: string;
  let createdItemId: string | undefined;

  beforeAll(async () => {
    userAToken = await createTestUserAndGetToken('userA');
    userBToken = await createTestUserAndGetToken('userB');
  });

  afterAll(async () => {
    if (!createdItemId) return;
    await request(`/items/${createdItemId}`, userAToken, { method: 'DELETE' });
  });

  it('rejects unauthenticated request', async () => {
    if (!API_URL) throw new Error('API_URL is required.');
    const response = await fetch(`${API_URL}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'test' }),
    });
    expect(response.status).toBe(401);
  });

  it('rejects invalid token', async () => {
    if (!API_URL) throw new Error('API_URL is required.');
    const response = await fetch(`${API_URL}/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer invalid',
      },
      body: JSON.stringify({ name: 'test' }),
    });
    expect(response.status).toBe(401);
  });

  it('runs full CRUD flow against deployed API (user A)', async () => {
    const createName = `integration-${Date.now()}`;

    const createRes = await request('/items', userAToken, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: createName }),
    });

    expect(createRes.status).toBe(201);
    expect(createRes.body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: createName,
      })
    );

    const created = createRes.body as Item;
    createdItemId = created.id;

    const getRes = await request(`/items/${created.id}`, userAToken);
    expect(getRes.status).toBe(200);
    expect(getRes.body).toEqual(
      expect.objectContaining({
        id: created.id,
        name: createName,
      })
    );

    const updatedName = `${createName}-updated`;
    const updateRes = await request(`/items/${created.id}`, userAToken, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: updatedName }),
    });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body).toEqual(
      expect.objectContaining({
        id: created.id,
        name: updatedName,
      })
    );

    const deleteRes = await request(`/items/${created.id}`, userAToken, {
      method: 'DELETE',
    });
    expect(deleteRes.status).toBe(204);
    createdItemId = undefined;

    const getDeletedRes = await request(`/items/${created.id}`, userAToken);
    expect(getDeletedRes.status).toBe(404);
    expect(getDeletedRes.body).toEqual(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'NOT_FOUND',
          message: 'Item not found',
        }),
      })
    );
  });

  it('isolation: user B cannot access user A item (GET/PUT/DELETE return 404)', async () => {
    const createName = `isolation-${Date.now()}`;
    const createRes = await request('/items', userAToken, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: createName }),
    });
    expect(createRes.status).toBe(201);
    const created = createRes.body as Item;
    const itemId = created.id;

    const getAsB = await request(`/items/${itemId}`, userBToken);
    expect(getAsB.status).toBe(404);
    expect(getAsB.body).toEqual(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'NOT_FOUND',
          message: 'Item not found',
        }),
      })
    );

    const updateAsB = await request(`/items/${itemId}`, userBToken, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'hacked' }),
    });
    expect(updateAsB.status).toBe(404);

    const deleteAsB = await request(`/items/${itemId}`, userBToken, {
      method: 'DELETE',
    });
    expect(deleteAsB.status).toBe(404);

    const getAsA = await request(`/items/${itemId}`, userAToken);
    expect(getAsA.status).toBe(200);
    expect((getAsA.body as Item).name).toBe(createName);

    await request(`/items/${itemId}`, userAToken, { method: 'DELETE' });
  });

  it('returns standardized validation error for invalid create request', async () => {
    const invalidRes = await request('/items', userAToken, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(invalidRes.status).toBe(400);
    expect(invalidRes.body).toEqual(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: expect.any(Array),
        }),
      })
    );
  });

  it('GET /items returns only the authenticated user items', async () => {
    const name1 = `list-a-${Date.now()}-1`;
    const name2 = `list-a-${Date.now()}-2`;

    const create1 = await request('/items', userAToken, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name1 }),
    });
    expect(create1.status).toBe(201);
    const item1 = create1.body as Item;

    const create2 = await request('/items', userAToken, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name2 }),
    });
    expect(create2.status).toBe(201);
    const item2 = create2.body as Item;

    const listRes = await request('/items', userAToken);
    expect(listRes.status).toBe(200);
    const listBody = listRes.body as { items: Item[] };
    expect(Array.isArray(listBody.items)).toBe(true);

    const ids = listBody.items.map(i => i.id);
    expect(ids).toContain(item1.id);
    expect(ids).toContain(item2.id);

    const listAsB = await request('/items', userBToken);
    expect(listAsB.status).toBe(200);
    const listBodyB = listAsB.body as { items: Item[] };
    expect(listBodyB.items.map(i => i.id)).not.toContain(item1.id);
    expect(listBodyB.items.map(i => i.id)).not.toContain(item2.id);

    await request(`/items/${item1.id}`, userAToken, { method: 'DELETE' });
    await request(`/items/${item2.id}`, userAToken, { method: 'DELETE' });
  });
});
