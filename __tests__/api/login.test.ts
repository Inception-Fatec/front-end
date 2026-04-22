import { POST } from "@/app/api/login/route";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";

const mockSingleFn = jest.fn();

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((body, init) => {
      return {
        status: init?.status || 200,
        json: async () => body,
      };
    }),
  },
}));

jest.mock("bcryptjs", () => ({
  compare: jest.fn(),
}));

jest.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: mockSingleFn,
    })),
  },
}));

function createMockRequest(body: unknown) {
  return {
    json: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
}

describe("Post /api/login", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("Deve retornar 400 se email ou senha estiverem faltando", async () => {
    const req = createMockRequest({ email: "test@example.com" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("email e password são obrigatórios.");
  });

  it("Deve retornar 403 se o usuario está inativo", async () => {
    mockSingleFn.mockResolvedValueOnce({
      data: {
        id: 1,
        email: "test@example.com",
        status: false,
        password: "hashed_password",
      },
      error: null,
    });
    const req = createMockRequest({
      email: "test@example.com",
      password: "password123",
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toBe("Usuário inativo.");
  });

  it("Deve retornar 401 se a senha não combinar", async () => {
    mockSingleFn.mockResolvedValueOnce({
      data: {
        id: 1,
        email: "test@example.com",
        status: true,
        password: "hashed_password",
      },
      error: null,
    });
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);
    const req = createMockRequest({
      email: "test@example.com",
      password: "wrongpasswprd",
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Credenciais inválidas.");
  });

  it("Deve retornar 200 e dados do usuário se as credenciais estiverem corretas", async () => {
    const mockUser = {
      id: 1,
      name: "João Silva",
      email: "test@example.com",
      role: "admin",
      status: true,
      password: "hashed_password",
    };
    mockSingleFn.mockResolvedValueOnce({ data: mockUser, error: null });
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
    const req = createMockRequest({
      email: "test@example.com",
      password: "password123",
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({
      id: 1,
      name: "João Silva",
      email: "test@example.com",
      role: "admin",
    });
  });
});
