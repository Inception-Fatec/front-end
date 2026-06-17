import { POST } from "@/app/api/forgot-password/route";
import { NextRequest } from "next/server";
import { requestPasswordReset } from "@/services/password-reset.service";

jest.mock("@/services/password-reset.service", () => ({
  requestPasswordReset: jest.fn(),
}));

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({
      status: init?.status || 200,
      json: async () => body,
    })),
  },
}));

function req(body: unknown, headersMap: Record<string, string> = {}) {
  return {
    json: jest.fn().mockResolvedValue(body),
    headers: {
      get: jest.fn((key: string) => headersMap[key] || null),
    },
  } as unknown as NextRequest;
}

describe("POST /api/forgot-password", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deve retornar 400 se email não for enviado", async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Email é obrigatório.");
  });

  it("deve retornar 429 se o serviço de reset estourar o Rate Limit", async () => {
    (requestPasswordReset as jest.Mock).mockResolvedValueOnce({
      success: false,
      error: "Muitas requisições. Tente mais tarde.",
    });

    const res = await POST(
      req({ email: "teste@fatec.com" }, { "x-forwarded-for": "192.168.0.1" }),
    );
    expect(res.status).toBe(429);
  });

  it("deve retornar 200 com sucesso e processar o email", async () => {
    (requestPasswordReset as jest.Mock).mockResolvedValueOnce({
      success: true,
    });

    const res = await POST(req({ email: " TESTE@fatec.com " }));

    expect(res.status).toBe(200);
    expect(requestPasswordReset).toHaveBeenCalledWith(
      "teste@fatec.com",
      "unknown",
    );
  });

  it("deve retornar 500 em caso de falha interna do sistema", async () => {
    (requestPasswordReset as jest.Mock).mockImplementationOnce(() =>
      Promise.reject(new Error("Erro de serviço")),
    );
    const res = await POST(req({ email: "teste@fatec.com" }));
    expect(res.status).toBe(500);
  });
});
