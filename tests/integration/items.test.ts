import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const API_URL = process.env.API_URL;
const region = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION;
const userPoolId = process.env.COGNITO_USER_POOL_ID;
const clientId = process.env.COGNITO_CLIENT_ID;

const cognito =
  region && userPoolId && clientId
    ? new CognitoIdentityProviderClient({ region })
    : null;

let accessToken: string;

async function authenticateTestUser(): Promise<void> {
  if (!cognito || !userPoolId || !clientId) {
    throw new Error(
      "COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID, and AWS_REGION are required for authenticated integration tests."
    );
  }

  const email = `test-${Date.now()}@example.com`;
  const password = "Password123!";

  await cognito.send(
    new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: email,
      TemporaryPassword: password,
      MessageAction: "SUPPRESS",
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
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: clientId,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    })
  );

  const token = auth.AuthenticationResult?.IdToken;
  if (!token) throw new Error("Failed to obtain IdToken from Cognito");
  accessToken = token;
}

type Item = {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
};

type JsonValue =
  | Record<string, unknown>
  | unknown[]
  | string
  | number
  | boolean
  | null;

async function request(
  path: string,
  init?: RequestInit
): Promise<{ status: number; body: JsonValue | null }> {
  if (!API_URL) throw new Error("API_URL is required for integration tests.");

  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

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

describe("items integration (real AWS + Cognito)", () => {
  let createdItemId: string | undefined;

  beforeAll(async () => {
    await authenticateTestUser();
  });

  afterAll(async () => {
    if (!createdItemId) return;
    await request(`/items/${createdItemId}`, { method: "DELETE" });
  });

  it("rejects unauthenticated request", async () => {
    if (!API_URL) throw new Error("API_URL is required.");
    const response = await fetch(`${API_URL}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "test" }),
    });
    expect(response.status).toBe(401);
  });

  it("rejects invalid token", async () => {
    if (!API_URL) throw new Error("API_URL is required.");
    const response = await fetch(`${API_URL}/items`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer invalid",
      },
      body: JSON.stringify({ name: "test" }),
    });
    expect(response.status).toBe(401);
  });

  it("runs full CRUD flow against deployed API", async () => {
    const createName = `integration-${Date.now()}`;

    const createRes = await request("/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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

    const getRes = await request(`/items/${created.id}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body).toEqual(
      expect.objectContaining({
        id: created.id,
        name: createName,
      })
    );

    const updatedName = `${createName}-updated`;
    const updateRes = await request(`/items/${created.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: updatedName }),
    });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body).toEqual(
      expect.objectContaining({
        id: created.id,
        name: updatedName,
      })
    );

    const deleteRes = await request(`/items/${created.id}`, {
      method: "DELETE",
    });
    expect(deleteRes.status).toBe(204);
    createdItemId = undefined;

    const getDeletedRes = await request(`/items/${created.id}`);
    expect(getDeletedRes.status).toBe(404);
    expect(getDeletedRes.body).toEqual(
      expect.objectContaining({
        error: expect.objectContaining({
          code: "NOT_FOUND",
          message: "Item not found",
        }),
      })
    );
  });

  it("returns standardized validation error for invalid create request", async () => {
    const invalidRes = await request("/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(invalidRes.status).toBe(400);
    expect(invalidRes.body).toEqual(
      expect.objectContaining({
        error: expect.objectContaining({
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details: expect.any(Array),
        }),
      })
    );
  });
});
