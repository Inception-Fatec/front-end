/* eslint-disable @typescript-eslint/no-explicit-any */
import { GET as getUsers, POST as postUser } from "@/app/api/users/route";
import { GET as getUserById, PUT as putUser } from "@/app/api/users/[id]/route";
import { auth } from "@/auth";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import sql from "@/lib/db-postgres";

jest.mock("@/lib/db-postgres");
jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({
      status: init?.status || 200,
      json: async () => body,
    })),
  },
}));
jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("bcryptjs", () => ({ hash: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockSql = (sql as any).__mockSql as jest.Mock;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(sql as any).unsafe = jest.fn();

function req(body?: unknown, url = "http://localhost/api/users") {
  return {
    url,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
}

describe("GET /api/users", () => {
  beforeEach(() => {
    mockSql.mockReset();
    jest.clearAllMocks();
  });

  it("401 nao autenticado", async () => {
    (auth as jest.Mock).mockResolvedValueOnce(null);
    const res = await getUsers(req());
    expect(res.status).toBe(401);
  });

  it("403 sem permissao", async () => {
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "USER" } });
    const res = await getUsers(req());
    expect(res.status).toBe(403);
  });

  it("200 lista usuarios", async () => {
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "ADMIN" } });
    const users = [
      {
        id: 1,
        name: "John",
        email: "j@j.com",
        role: "ADMIN",
        status: true,
        created_at: "2024-01-01",
      },
    ];
    let callIdx = 0;
    mockSql.mockImplementation(() => {
      const idx2 = callIdx++;
      if (idx2 === 3) return Promise.resolve(users);
      return Promise.resolve([{ count: 1 }]);
    });
    const res = await getUsers(req());
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data).toEqual(users);
    expect(json.total).toBe(1);
  });
});

describe("POST /api/users", () => {
  beforeEach(() => {
    mockSql.mockReset();
    jest.clearAllMocks();
  });

  it("401 nao autenticado", async () => {
    (auth as jest.Mock).mockResolvedValueOnce(null);
    const res = await postUser(
      req({ name: "J", email: "j@j.com", password: "pass123", role: "USER" }),
    );
    expect(res.status).toBe(401);
  });

  it("403 sem permissao", async () => {
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "USER" } });
    const res = await postUser(
      req({ name: "J", email: "j@j.com", password: "pass123", role: "USER" }),
    );
    expect(res.status).toBe(403);
  });

  it("400 campos faltando", async () => {
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "ADMIN" } });
    const res = await postUser(req({ name: "J", email: "j@j.com" }));
    expect(res.status).toBe(400);
  });

  it("400 role invalido", async () => {
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "ADMIN" } });
    const res = await postUser(
      req({
        name: "J",
        email: "j@j.com",
        password: "pass123",
        role: "INVALID",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("400 senha curta", async () => {
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "ADMIN" } });
    const res = await postUser(
      req({ name: "J", email: "j@j.com", password: "123", role: "USER" }),
    );
    expect(res.status).toBe(400);
  });

  it("409 email em uso", async () => {
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "ADMIN" } });
    mockSql.mockResolvedValueOnce([{ id: 1 }]);
    const res = await postUser(
      req({ name: "J", email: "j@j.com", password: "pass123", role: "USER" }),
    );
    expect(res.status).toBe(409);
  });

  it("201 criado com sucesso", async () => {
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "ADMIN" } });
    mockSql.mockResolvedValueOnce([]);
    (bcrypt.hash as jest.Mock).mockResolvedValueOnce("hashed");
    mockSql.mockResolvedValueOnce([
      {
        id: 1,
        name: "J",
        email: "j@j.com",
        role: "USER",
        created_at: "2024-01-01",
      },
    ]);
    const res = await postUser(
      req({ name: "J", email: "j@j.com", password: "pass123", role: "USER" }),
    );
    expect(res.status).toBe(201);
  });
});

describe("GET /api/users/[id]", () => {
  beforeEach(() => {
    mockSql.mockReset();
    jest.clearAllMocks();
  });

  it("401 nao autenticado", async () => {
    (auth as jest.Mock).mockResolvedValueOnce(null);
    const res = await getUserById(req(), {
      params: Promise.resolve({ id: "1" }),
    });
    expect(res.status).toBe(401);
  });

  it("403 sem permissao", async () => {
    (auth as jest.Mock).mockResolvedValueOnce({
      user: { id: "1", role: "USER" },
    });
    mockSql.mockResolvedValueOnce([{ role: "OPERATOR" }]);
    const res = await getUserById(req(), {
      params: Promise.resolve({ id: "2" }),
    });
    expect(res.status).toBe(403);
  });

  it("404 nao encontrado", async () => {
    (auth as jest.Mock).mockResolvedValueOnce({
      user: { id: "1", role: "ADMIN" },
    });
    mockSql.mockResolvedValueOnce([]);
    const res = await getUserById(req(), {
      params: Promise.resolve({ id: "999" }),
    });
    expect(res.status).toBe(404);
  });

  it("200 admin acessa usuario", async () => {
    (auth as jest.Mock).mockResolvedValueOnce({
      user: { id: "1", role: "ADMIN" },
    });
    const user = {
      id: 1,
      name: "J",
      email: "j@j.com",
      role: "USER",
      status: true,
      created_at: "2024-01-01",
    };
    mockSql.mockResolvedValueOnce([user]);
    const res = await getUserById(req(), {
      params: Promise.resolve({ id: "1" }),
    });
    expect(res.status).toBe(200);
  });

  it("200 proprio usuario", async () => {
    (auth as jest.Mock).mockResolvedValueOnce({
      user: { id: "1", role: "OPERATOR" },
    });
    mockSql.mockResolvedValueOnce([{ role: "OPERATOR" }]);
    const user = {
      id: 1,
      name: "J",
      email: "j@j.com",
      role: "USER",
      status: true,
      created_at: "2024-01-01",
    };
    mockSql.mockResolvedValueOnce([user]);
    const res = await getUserById(req(), {
      params: Promise.resolve({ id: "1" }),
    });
    expect(res.status).toBe(200);
  });
});

describe("PUT /api/users/[id]", () => {
  beforeEach(() => {
    mockSql.mockReset();
    (sql as any).unsafe = jest.fn();
    jest.clearAllMocks();
  });

  it("401 nao autenticado", async () => {
    (auth as jest.Mock).mockResolvedValueOnce(null);
    const res = await putUser(req({ name: "Updated" }), {
      params: Promise.resolve({ id: "1" }),
    });
    expect(res.status).toBe(401);
  });

  it("403 sem permissao para ADMIN", async () => {
    (auth as jest.Mock).mockResolvedValueOnce({
      user: { id: "1", role: "OPERATOR" },
    });
    mockSql.mockResolvedValueOnce([{ role: "USER" }]);
    const res = await putUser(req({ role: "ADMIN" }), {
      params: Promise.resolve({ id: "2" }),
    });
    expect(res.status).toBe(403);
  });

  it("400 role invalido", async () => {
    (auth as jest.Mock).mockResolvedValueOnce({
      user: { id: "1", role: "ADMIN" },
    });
    const res = await putUser(req({ role: "INVALID" }), {
      params: Promise.resolve({ id: "1" }),
    });
    expect(res.status).toBe(400);
  });

  it("400 nenhum campo", async () => {
    (auth as jest.Mock).mockResolvedValueOnce({
      user: { id: "1", role: "OPERATOR" },
    });
    mockSql.mockResolvedValueOnce([{ role: "USER" }]);
    const res = await putUser(req({}), {
      params: Promise.resolve({ id: "1" }),
    });
    expect(res.status).toBe(400);
  });

  it("200 atualizado com sucesso", async () => {
    (auth as jest.Mock).mockResolvedValueOnce({
      user: { id: "1", role: "ADMIN" },
    });
    (bcrypt.hash as jest.Mock).mockResolvedValueOnce("new_hash");
    (sql as any).unsafe = jest.fn().mockResolvedValueOnce([
      {
        id: 1,
        name: "Updated",
        email: "j@j.com",
        role: "USER",
        status: true,
        created_at: "2024-01-01",
      },
    ]);
    const res = await putUser(
      req({ name: "Updated", password: "newpass123" }),
      { params: Promise.resolve({ id: "1" }) },
    );
    expect(res.status).toBe(200);
  });
});
