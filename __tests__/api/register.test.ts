import { POST } from "@/app/api/register/route";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import sql from "@/lib/db-postgres";

jest.mock("@/lib/db-postgres");
jest.mock("bcryptjs", () => ({ hash: jest.fn() }));
jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({
      status: init?.status || 200,
      json: async () => body,
    })),
  },
}));

const mockSql = sql as unknown as jest.Mock;

function req(body: unknown) {
  return { json: jest.fn().mockResolvedValue(body) } as unknown as NextRequest;
}

describe("POST /api/register", () => {
  beforeEach(() => {
    mockSql.mockReset();
    jest.clearAllMocks();
  });

  it("deve retornar 201 ao registrar usuário com sucesso", async () => {
    mockSql.mockResolvedValueOnce([]);
    (bcrypt.hash as jest.Mock).mockResolvedValueOnce("senha_hasheada");
    mockSql.mockResolvedValueOnce([{ id: 1, name: "Joao", email: "t@t.com" }]);

    const res = await POST(
      req({ name: "Joao", email: "t@t.com", password: "password123" }),
    );
    expect(res.status).toBe(201);
  });

  it("deve retornar 400 se faltarem campos obrigatórios", async () => {
    const res = await POST(req({ email: "t@t.com" }));
    expect(res.status).toBe(400);
  });

  it("deve retornar 400 se a senha for muito curta", async () => {
    const res = await POST(
      req({ name: "Joao", email: "t@t.com", password: "123" }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(
      "A senha deve ter no mínimo 6 caracteres.",
    );
  });

  it("deve retornar 409 se o usuário já existir no banco de dados", async () => {
    mockSql.mockResolvedValueOnce([{ id: 1 }]);

    const res = await POST(
      req({ name: "Joao", email: "t@t.com", password: "password123" }),
    );
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("Email já está em uso.");
  });

  it("deve retornar 500 em caso de erro interno do servidor", async () => {
    mockSql.mockImplementation(() =>
      Promise.reject(new Error("Falha no banco de dados")),
    );

    const res = await POST(
      req({ name: "Joao", email: "t@t.com", password: "password123" }),
    );
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("Erro interno do servidor.");
  });
});
