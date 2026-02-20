const API_URL = process.env.API_URL;

type Item = {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
};

type JsonValue = Record<string, unknown> | unknown[] | string | number | boolean | null;

async function request(path: string, init?: RequestInit): Promise<{ status: number; body: JsonValue | null }> {
  if (!API_URL) throw new Error("API_URL is required for integration tests.");

  const response = await fetch(`${API_URL}${path}`, init);
  const text = await response.text();

  if (!text) {
    return { status: response.status, body: null };
  }

  try {
    return { status: response.status, body: JSON.parse(text) as JsonValue };
  } catch {
    return { status: response.status, body: text };
  }
}

describe("items integration (real AWS)", () => {
  let createdItemId: string | undefined;

  afterAll(async () => {
    if (!createdItemId) return;
    await request(`/items/${createdItemId}`, { method: "DELETE" });
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

    const deleteRes = await request(`/items/${created.id}`, { method: "DELETE" });
    expect(deleteRes.status).toBe(204);
    createdItemId = undefined;

    const getDeletedRes = await request(`/items/${created.id}`);
    expect(getDeletedRes.status).toBe(404);
    expect(getDeletedRes.body).toEqual(
      expect.objectContaining({
        error: "Item not found",
      })
    );
  });
});
