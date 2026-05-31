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

const mockSql = sql as jest.Mock;

function req(body: unknown) {
  return { json: jest.fn().mockResolvedValue(body) } as unknown as NextRequest;
}

describe("Post /api/login", () => {
  beforeEach(() => {
    mockSql.mockReset();
    jest.clearAllMocks();
  });

  it("400 se campos faltando", async () => {
    const res = await POST(req({ email: "t@t.com" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("email e password são obrigatórios.");
  });

  it("403 usuario inativo", async () => {
    mockSql.mockResolvedValueOnce([
      { id: 1, email: "t@t.com", status: false, password: "hash" },
    ]);
    const res = await POST(req({ email: "t@t.com", password: "pass123" }));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("Usuário inativo.");
  });

  it("401 senha errada", async () => {
    mockSql.mockResolvedValueOnce([
      { id: 1, email: "t@t.com", status: true, password: "hash" },
    ]);
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);
    const res = await POST(req({ email: "t@t.com", password: "wrong" }));
    expect(res.status).toBe(401);
  });

  it("200 credenciais corretas", async () => {
    mockSql.mockResolvedValueOnce([
      {
        id: 1,
        name: "Joao",
        email: "t@t.com",
        role: "admin",
        status: true,
        password: "hash",
      },
    ]);
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
    const res = await POST(req({ email: "t@t.com", password: "pass123" }));
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe(1);
  });
});
