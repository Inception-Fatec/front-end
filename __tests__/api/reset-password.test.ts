import { POST } from "@/app/api/reset-password/route";
import { NextRequest } from "next/server";
import { resetPassword } from "@/services/password-reset.service";

jest.mock("@/services/password-reset.service", () => ({
  resetPassword: jest.fn(),
}));

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({
      status: init?.status || 200,
      json: async () => body,
    })),
  },
}));

function req(body: unknown) {
  return { json: jest.fn().mockResolvedValue(body) } as unknown as NextRequest;
}

describe("POST /api/reset-password", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deve retornar 400 se faltar o token", async () => {
    const res = await POST(req({ password: "senha_nova_123" }));
    expect(res.status).toBe(400);
  });

  it("deve retornar 400 se faltar a senha", async () => {
    const res = await POST(req({ token: "token_abc123" }));
    expect(res.status).toBe(400);
  });

  it("deve retornar 400 se o token for inválido/expirado", async () => {
    (resetPassword as jest.Mock).mockResolvedValueOnce({
      success: false,
      error: "Token inválido ou expirado.",
    });

    const res = await POST(req({ token: "invalido", password: "123" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Token inválido ou expirado.");
  });

  it("deve retornar 200 ao alterar senha com sucesso", async () => {
    (resetPassword as jest.Mock).mockResolvedValueOnce({ success: true });

    const res = await POST(req({ token: "valido", password: "nova_senha" }));
    expect(res.status).toBe(200);
  });

  it("deve retornar 500 se ocorrer erro inesperado no banco", async () => {
    (resetPassword as jest.Mock).mockImplementationOnce(() =>
      Promise.reject(new Error("Erro DB")),
    );
    const res = await POST(req({ token: "valido", password: "nova" }));
    expect(res.status).toBe(500);
  });
});
