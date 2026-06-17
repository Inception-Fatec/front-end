import { POST } from "@/app/api/login/route";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
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
jest.mock("bcryptjs", () => ({ compare: jest.fn() }));

const mockSql = sql as unknown as jest.Mock;

function req(body: unknown) {
  return { json: jest.fn().mockResolvedValue(body) } as unknown as NextRequest;
}

describe("POST /api/login", () => {
  beforeEach(() => {
    mockSql.mockReset();
    jest.clearAllMocks();
  });

  it("deve retornar 200 e os dados do usuário ao enviar credenciais válidas", async () => {
    mockSql.mockResolvedValueOnce([
      {
        id: 1,
        name: "Lucas",
        email: "lucas@fatec.com",
        role: "admin",
        status: true,
        password: "hashed_password",
      },
    ]);
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

    const res = await POST(
      req({ email: "lucas@fatec.com", password: "senha_correta" }),
    );
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data).toEqual({
      id: 1,
      name: "Lucas",
      email: "lucas@fatec.com",
      role: "admin",
    });
  });

  it("deve retornar 400 se email ou password estiverem faltando", async () => {
    const res = await POST(req({ email: "lucas@fatec.com" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("email e password são obrigatórios.");
  });

  it("deve retornar 401 se o usuário não for encontrado no banco de dados", async () => {
    mockSql.mockResolvedValueOnce([]);

    const res = await POST(
      req({ email: "inexistente@fatec.com", password: "senha" }),
    );
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("Credenciais inválidas.");
  });

  it("deve retornar 401 se a senha estiver incorreta", async () => {
    mockSql.mockResolvedValueOnce([
      {
        id: 1,
        email: "lucas@fatec.com",
        status: true,
        password: "hashed_password",
      },
    ]);
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

    const res = await POST(
      req({ email: "lucas@fatec.com", password: "senha_errada" }),
    );
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("Credenciais inválidas.");
  });

  it("deve retornar 403 se o usuário estiver inativo", async () => {
    mockSql.mockResolvedValueOnce([
      {
        id: 1,
        email: "lucas@fatec.com",
        status: false,
        password: "hashed_password",
      },
    ]);

    const res = await POST(
      req({ email: "lucas@fatec.com", password: "senha_correta" }),
    );
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("Usuário inativo.");
  });

  it("deve retornar 500 se ocorrer um erro interno (ex: falha de conexão com o banco)", async () => {
    mockSql.mockImplementation(() =>
      Promise.reject(new Error("Falha na conexão com o banco de dados")),
    );

    const res = await POST(
      req({ email: "lucas@fatec.com", password: "senha_correta" }),
    );
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("Erro interno do servidor.");
  });
});
