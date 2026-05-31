import { DELETE, POST } from "@/app/api/stations/route";
import { auth } from "@/auth";
import { NextRequest } from "next/server";
import sql from "@/lib/db-postgres";

jest.mock("@/lib/db-postgres");
jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({ status: init?.status || 200, json: async () => body })),
  },
}));
jest.mock("@/auth", () => ({ auth: jest.fn() }));

const mockSql = sql as jest.Mock;

function req(body: unknown) {
  return { json: jest.fn().mockResolvedValue(body) } as unknown as NextRequest;
}

describe("Post /api/stations", () => {
  beforeEach(() => { mockSql.mockReset(); jest.clearAllMocks(); });

  it("401 nao autenticado", async () => {
    (auth as jest.Mock).mockResolvedValueOnce(null);
    const res = await POST(req({ name: "S1", id_datalogger: "dl001" }));
    expect(res.status).toBe(401);
  });

  it("403 nao admin", async () => {
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "USER" } });
    const res = await POST(req({ name: "S1", id_datalogger: "dl001" }));
    expect(res.status).toBe(403);
  });

  it("400 campos faltando", async () => {
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "ADMIN" } });
    const res = await POST(req({ name: "S1" }));
    expect(res.status).toBe(400);
  });

  it("409 nome em uso", async () => {
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "ADMIN" } });
    mockSql.mockResolvedValueOnce([{ id: 1 }]);
    const res = await POST(req({ name: "Existing", id_datalogger: "dl001" }));
    expect(res.status).toBe(409);
  });

  it("201 criado com sucesso", async () => {
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "ADMIN" } });
    mockSql.mockResolvedValueOnce([]);
    mockSql.mockResolvedValueOnce([]);
    mockSql.mockResolvedValueOnce([{ id: 1 }]);
    mockSql.mockResolvedValueOnce([{ id: 1, name: "S1", id_datalogger: "dl001", created_at: "2024-01-01", station_groupings: null, parameters: null }]);
    const res = await POST(req({ name: "S1", id_datalogger: "dl001" }));
    expect(res.status).toBe(201);
  });
});

describe("DELETE /api/stations", () => {
  beforeEach(() => { mockSql.mockReset(); jest.clearAllMocks(); });

  it("401 nao autenticado", async () => {
    (auth as jest.Mock).mockResolvedValueOnce(null);
    const res = await DELETE(req({ id: 1 }));
    expect(res.status).toBe(401);
  });

  it("403 nao admin", async () => {
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "USER" } });
    const res = await DELETE(req({ id: 1 }));
    expect(res.status).toBe(403);
  });

  it("400 id faltando", async () => {
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "ADMIN" } });
    const res = await DELETE(req({}));
    expect(res.status).toBe(400);
  });

  it("200 deletado com sucesso", async () => {
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "ADMIN" } });
    mockSql.mockResolvedValueOnce([{ id: 1 }]);
    mockSql.mockResolvedValueOnce([]);
    mockSql.mockResolvedValueOnce([]);
    mockSql.mockResolvedValueOnce([]);
    const res = await DELETE(req({ id: 1 }));
    expect(res.status).toBe(200);
  });
});
