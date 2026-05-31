import { POST } from "@/app/api/register/route";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import sql from "@/lib/db-postgres";

jest.mock("@/lib/db-postgres");
jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({ status: init?.status || 200, json: async () => body })),
  },
}));
jest.mock("bcryptjs", () => ({ hash: jest.fn() }));

const mockSql = sql as jest.Mock;

function req(body: unknown) {
  return { json: jest.fn().mockResolvedValue(body) } as unknown as NextRequest;
}

describe("Post /api/register", () => {
  beforeEach(() => { mockSql.mockReset(); jest.clearAllMocks(); });

  it("400 se campos faltando", async () => {
    const res = await POST(req({ name: "Joao", email: "t@t.com" }));
    expect(res.status).toBe(400);
  });

  it("400 senha curta", async () => {
    const res = await POST(req({ name: "Joao", email: "t@t.com", password: "123" }));
    expect(res.status).toBe(400);
  });

  it("409 email em uso", async () => {
    mockSql.mockResolvedValueOnce([{ id: 1 }]);
    const res = await POST(req({ name: "Joao", email: "t@t.com", password: "password123" }));
    expect(res.status).toBe(409);
  });

  it("201 criado com sucesso", async () => {
    mockSql.mockResolvedValueOnce([]);
    (bcrypt.hash as jest.Mock).mockResolvedValueOnce("hashed");
    mockSql.mockResolvedValueOnce([{ id: 1, name: "Joao", email: "t@t.com", role: "USER", created_at: "2024-01-01" }]);
    const res = await POST(req({ name: "Joao", email: "t@t.com", password: "password123" }));
    expect(res.status).toBe(201);
  });
});
