import { DELETE, GET, POST, PUT } from "@/app/api/stations/route";
import { auth } from "@/auth";
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
jest.mock("@/auth", () => ({ auth: jest.fn() }));

const mockSql = sql as jest.Mock;

// Retorna um fake TemplateStringsArray para que o mock consiga detectar tagged templates
function isFragment(firstArg: unknown): boolean {
  if (!Array.isArray(firstArg)) return false;
  if (!("raw" in (firstArg as object))) return false;
  const firstString = (firstArg as string[])[0] ?? "";
  // Fragmentos: não começam com palavra-chave SQL real
  return !/^\s*(SELECT|INSERT|UPDATE|DELETE|WITH)\b/i.test(firstString);
}

// Configura o mockSql para ignorar chamadas de fragmento e só consumir respostas
// para queries reais. Chame no beforeEach de cada describe.
function setupSqlMock(responses: unknown[]) {
  const queue = [...responses];
  mockSql.mockReset();
  mockSql.mockImplementation((...args: unknown[]) => {
    if (isFragment(args[0])) {
      return { __fragment: true };
    }
    const next = queue.shift();
    if (next instanceof Error) return Promise.reject(next);
    return Promise.resolve(next ?? []);
  });
}

function req(body: unknown) {
  return { json: jest.fn().mockResolvedValue(body) } as unknown as NextRequest;
}

function getReq(params: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/stations");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return { url: url.toString() } as unknown as NextRequest;
}

// ─── POST ────────────────────────────────────────────────────────────────────

describe("POST /api/stations", () => {
  beforeEach(() => jest.clearAllMocks());

  it("401 nao autenticado", async () => {
    setupSqlMock([]);
    (auth as jest.Mock).mockResolvedValueOnce(null);
    const res = await POST(req({ name: "S1", id_datalogger: "dl001" }));
    expect(res.status).toBe(401);
  });

  it("403 nao admin", async () => {
    setupSqlMock([]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "USER" } });
    const res = await POST(req({ name: "S1", id_datalogger: "dl001" }));
    expect(res.status).toBe(403);
  });

  it("400 campos faltando", async () => {
    setupSqlMock([]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "ADMIN" } });
    const res = await POST(req({ name: "S1" }));
    expect(res.status).toBe(400);
  });

  it("409 nome em uso", async () => {
    setupSqlMock([[{ id: 1 }]]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "ADMIN" } });
    const res = await POST(req({ name: "Existing", id_datalogger: "dl001" }));
    expect(res.status).toBe(409);
  });

  it("409 datalogger em uso", async () => {
    setupSqlMock([[], [{ id: 99 }]]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "ADMIN" } });
    const res = await POST(req({ name: "Nova", id_datalogger: "dl001" }));
    expect(res.status).toBe(409);
  });

  it("400 grouping invalido", async () => {
    setupSqlMock([[], [], [{ id: 1 }]]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "ADMIN" } });
    const res = await POST(
      req({ name: "Nova", id_datalogger: "dl001", groupings: [1, 2] }),
    );
    expect(res.status).toBe(400);
  });

  it("201 criado com parameters e groupings", async () => {
    setupSqlMock([
      [], // SELECT nome livre
      [], // SELECT datalogger livre
      [{ id: 1 }, { id: 2 }], // SELECT groupings válidos
      [{ id: 10 }], // INSERT station
      [], // INSERT parameters
      [], // INSERT station_groupings
      [
        {
          id: 10,
          name: "Nova",
          id_datalogger: "dl001",
          station_groupings: [],
          parameters: [],
        },
      ],
    ]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "ADMIN" } });
    const res = await POST(
      req({
        name: "Nova",
        id_datalogger: "dl001",
        parameters: [1, 2],
        groupings: [1, 2],
      }),
    );
    expect(res.status).toBe(201);
  });

  it("201 criado sem parameters e groupings", async () => {
    setupSqlMock([
      [], // nome livre
      [], // datalogger livre
      [{ id: 1 }], // INSERT station
      [
        {
          id: 1,
          name: "S1",
          id_datalogger: "dl001",
          station_groupings: null,
          parameters: null,
        },
      ],
    ]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "ADMIN" } });
    const res = await POST(req({ name: "S1", id_datalogger: "dl001" }));
    expect(res.status).toBe(201);
  });

  it("500 erro interno", async () => {
    setupSqlMock([new Error("fail")]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "ADMIN" } });
    const res = await POST(req({ name: "S1", id_datalogger: "dl001" }));
    expect(res.status).toBe(500);
  });
});

// ─── GET ─────────────────────────────────────────────────────────────────────

describe("GET /api/stations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });
  it("401 nao autenticado", async () => {
    setupSqlMock([]);
    (auth as jest.Mock).mockResolvedValueOnce(null);
    const res = await GET(getReq());
    expect(res.status).toBe(401);
  });

  it("404 estacao nao encontrada por id", async () => {
    setupSqlMock([[]]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "USER" } });
    const res = await GET(getReq({ id: "999" }));
    expect(res.status).toBe(404);
  });

  it("200 retorna estacao por id com medicoes", async () => {
    setupSqlMock([
      [
        {
          id: 1,
          name: "S1",
          parameters: [{ id: 10 }, { id: 11 }],
          station_groupings: null,
        },
      ],
      [{ id: 1, value: 5.5, date_time: "2024-01-01" }], // medições param 10
      [{ id: 2, value: 3.1, date_time: "2024-01-02" }], // medições param 11
    ]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "USER" } });
    const res = await GET(getReq({ id: "1" }));
    expect(res.status).toBe(200);
  });

  it("200 retorna estacao por id sem parametros", async () => {
    setupSqlMock([
      [{ id: 2, name: "S2", parameters: null, station_groupings: null }],
    ]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "USER" } });
    const res = await GET(getReq({ id: "2" }));
    expect(res.status).toBe(200);
  });

  it("200 lista paginada default", async () => {
    setupSqlMock([
      [{ id: 1, name: "S1", parameters: null, station_groupings: null }],
      [{ count: 1 }],
    ]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "USER" } });
    const res = await GET(getReq());
    expect(res.status).toBe(200);
  });

  it("200 lista com search e status active", async () => {
    setupSqlMock([[], [{ count: 0 }]]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "ADMIN" } });
    const res = await GET(getReq({ search: "rio", status: "active" }));
    expect(res.status).toBe(200);
  });

  it("200 lista com status inactive", async () => {
    setupSqlMock([[], [{ count: 0 }]]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "ADMIN" } });
    const res = await GET(getReq({ status: "inactive" }));
    expect(res.status).toBe(200);
  });

  it("200 lista com limit=all", async () => {
    setupSqlMock([[], [{ count: 0 }]]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "ADMIN" } });
    const res = await GET(getReq({ limit: "all" }));
    expect(res.status).toBe(200);
  });

  it("200 filtro por grouping com resultados", async () => {
    setupSqlMock([
      [{ id_station: 1 }, { id_station: 2 }], // station_groupings
      [
        { id: 1, name: "S1" },
        { id: 2, name: "S2" },
      ],
      [{ count: 2 }],
    ]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "USER" } });
    const res = await GET(getReq({ grouping: "5" }));
    expect(res.status).toBe(200);
  });

  it("200 filtro por grouping sem estacoes", async () => {
    setupSqlMock([[]]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "USER" } });
    const res = await GET(getReq({ grouping: "99" }));
    expect(res.status).toBe(200);
  });

  it("500 erro interno", async () => {
    setupSqlMock([new Error("fail")]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "USER" } });
    const res = await GET(getReq());
    expect(res.status).toBe(500);
  });
});

// ─── PUT ─────────────────────────────────────────────────────────────────────

describe("PUT /api/stations", () => {
  beforeEach(() => jest.clearAllMocks());

  it("401 nao autenticado", async () => {
    setupSqlMock([]);
    (auth as jest.Mock).mockResolvedValueOnce(null);
    const res = await PUT(req({ id: 1, name: "S1" }));
    expect(res.status).toBe(401);
  });

  it("403 usuario comum", async () => {
    setupSqlMock([]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "USER" } });
    const res = await PUT(req({ id: 1, name: "S1" }));
    expect(res.status).toBe(403);
  });

  it("400 id faltando", async () => {
    setupSqlMock([]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "ADMIN" } });
    const res = await PUT(req({ name: "S1" }));
    expect(res.status).toBe(400);
  });

  it("400 operator sem nome ou status", async () => {
    setupSqlMock([]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "OPERATOR" } });
    const res = await PUT(req({ id: 1 }));
    expect(res.status).toBe(400);
  });

  it("409 operator nome em uso", async () => {
    setupSqlMock([[{ id: 99 }]]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "OPERATOR" } });
    const res = await PUT(req({ id: 1, name: "Duplicado" }));
    expect(res.status).toBe(409);
  });

  it("404 operator estacao nao encontrada", async () => {
    setupSqlMock([[], []]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "OPERATOR" } });
    const res = await PUT(req({ id: 1, name: "Nova" }));
    expect(res.status).toBe(404);
  });

  it("200 operator atualiza nome", async () => {
    setupSqlMock([[], [{ id: 1, name: "Nova", status: true }]]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "OPERATOR" } });
    const res = await PUT(req({ id: 1, name: "Nova" }));
    expect(res.status).toBe(200);
  });

  it("200 operator atualiza status sem nome", async () => {
    setupSqlMock([[{ id: 1, name: "S1", status: false }]]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "OPERATOR" } });
    const res = await PUT(req({ id: 1, status: false }));
    expect(res.status).toBe(200);
  });

  it("409 admin nome em uso", async () => {
    setupSqlMock([[{ id: 99 }]]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "ADMIN" } });
    const res = await PUT(
      req({ id: 1, name: "Duplicado", id_datalogger: "dl", status: true }),
    );
    expect(res.status).toBe(409);
  });

  it("200 admin atualiza com parameters e groupings", async () => {
    setupSqlMock([
      [], // SELECT nome livre
      [], // UPDATE station
      [], // DELETE parameters
      [], // INSERT parameters
      [], // DELETE groupings
      [], // INSERT groupings
      [{ id: 1, name: "S1", station_groupings: [], parameters: [] }],
    ]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "ADMIN" } });
    const res = await PUT(
      req({
        id: 1,
        name: "S1",
        id_datalogger: "dl",
        status: true,
        parameters: [1, 2],
        groupings: [1],
      }),
    );
    expect(res.status).toBe(200);
  });

  it("200 admin atualiza com groupings vazios", async () => {
    setupSqlMock([
      [], // SELECT nome livre
      [], // UPDATE station
      [], // DELETE groupings
      [{ id: 1, name: "S1", parameters: null, station_groupings: null }],
    ]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "ADMIN" } });
    const res = await PUT(
      req({
        id: 1,
        name: "S1",
        id_datalogger: "dl",
        status: true,
        groupings: [],
      }),
    );
    expect(res.status).toBe(200);
  });

  it("500 erro interno", async () => {
    setupSqlMock([new Error("fail")]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "ADMIN" } });
    const res = await PUT(req({ id: 1, name: "S1" }));
    expect(res.status).toBe(500);
  });
});

// ─── DELETE ──────────────────────────────────────────────────────────────────

describe("DELETE /api/stations", () => {
  beforeEach(() => jest.clearAllMocks());

  it("401 nao autenticado", async () => {
    setupSqlMock([]);
    (auth as jest.Mock).mockResolvedValueOnce(null);
    const res = await DELETE(req({ id: 1 }));
    expect(res.status).toBe(401);
  });

  it("403 nao admin", async () => {
    setupSqlMock([]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "USER" } });
    const res = await DELETE(req({ id: 1 }));
    expect(res.status).toBe(403);
  });

  it("400 id faltando", async () => {
    setupSqlMock([]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "ADMIN" } });
    const res = await DELETE(req({}));
    expect(res.status).toBe(400);
  });

  it("404 estacao nao encontrada", async () => {
    setupSqlMock([[]]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "ADMIN" } });
    const res = await DELETE(req({ id: 999 }));
    expect(res.status).toBe(404);
  });

  it("200 deletado com sucesso", async () => {
    setupSqlMock([[{ id: 1 }], [], [], []]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "ADMIN" } });
    const res = await DELETE(req({ id: 1 }));
    expect(res.status).toBe(200);
  });

  it("500 erro interno", async () => {
    setupSqlMock([new Error("fail")]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "ADMIN" } });
    const res = await DELETE(req({ id: 1 }));
    expect(res.status).toBe(500);
  });
});
