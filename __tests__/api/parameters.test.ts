import { GET, POST, PUT } from "@/app/api/parameters/route";
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

function isFragment(firstArg: unknown): boolean {
  if (!Array.isArray(firstArg)) return false;
  if (!("raw" in (firstArg as object))) return false;
  const firstString = (firstArg as string[])[0] ?? "";
  return !/^\s*(SELECT|INSERT|UPDATE|DELETE|WITH)\b/i.test(firstString);
}

function setupSqlMock(responses: unknown[]) {
  const queue = [...responses];
  mockSql.mockReset();
  mockSql.mockImplementation((...args: unknown[]) => {
    if (isFragment(args[0])) return { __fragment: true };
    const next = queue.shift();
    if (next instanceof Error) return Promise.reject(next);
    return Promise.resolve(next ?? []);
  });
}

function req(body: unknown) {
  return { json: jest.fn().mockResolvedValue(body) } as unknown as NextRequest;
}

function getReq(params: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/parameter-types");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return { url: url.toString() } as unknown as NextRequest;
}

describe("POST /api/parameter-types", () => {
  beforeEach(() => jest.clearAllMocks());

  it("401 não autenticado", async () => {
    setupSqlMock([]);
    (auth as jest.Mock).mockResolvedValueOnce(null);
    const res = await POST(
      req({ name: "Temperatura", unit: "°C", symbol: "T", stationIds: [1] }),
    );
    expect(res.status).toBe(401);
  });

  it("403 usuário sem permissão (role USER)", async () => {
    setupSqlMock([]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "USER" } });
    const res = await POST(
      req({ name: "Temperatura", unit: "°C", symbol: "T", stationIds: [1] }),
    );
    expect(res.status).toBe(403);
  });

  it("400 name ausente", async () => {
    setupSqlMock([]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "ADMIN" } });
    const res = await POST(req({ unit: "°C", symbol: "T", stationIds: [1] }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it("400 unit ausente", async () => {
    setupSqlMock([]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "ADMIN" } });
    const res = await POST(
      req({ name: "Temperatura", symbol: "T", stationIds: [1] }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it("400 symbol ausente", async () => {
    setupSqlMock([]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "ADMIN" } });
    const res = await POST(
      req({ name: "Temperatura", unit: "°C", stationIds: [1] }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it("400 name vazio (string em branco)", async () => {
    setupSqlMock([]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "ADMIN" } });
    const res = await POST(
      req({ name: "   ", unit: "°C", symbol: "T", stationIds: [1] }),
    );
    expect(res.status).toBe(400);
  });

  it("400 nenhuma estação informada (stationIds vazio e sem stationId)", async () => {
    setupSqlMock([]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "ADMIN" } });
    const res = await POST(
      req({ name: "Temperatura", unit: "°C", symbol: "T", stationIds: [] }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/esta[çc][aã]o/i);
  });

  it("400 stationIds com valores não numéricos são filtrados, resultando em lista vazia", async () => {
    setupSqlMock([]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "ADMIN" } });
    const res = await POST(
      req({
        name: "Temperatura",
        unit: "°C",
        symbol: "T",
        stationIds: ["abc", null],
      }),
    );
    expect(res.status).toBe(400);
  });

  it("409 tipo de parâmetro com mesmo nome já existe (ativo)", async () => {
    setupSqlMock([[{ id: 5 }]]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "ADMIN" } });
    const res = await POST(
      req({
        name: "Temperatura",
        unit: "°C",
        symbol: "T",
        stationIds: [1],
      }),
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/j[aá] existe/i);
  });

  it("400 estação informada não existe no banco", async () => {
    setupSqlMock([[], []]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "ADMIN" } });
    const res = await POST(
      req({
        name: "Temperatura",
        unit: "°C",
        symbol: "T",
        stationIds: [999],
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/esta[çc][oõ]es/i);
  });

  it("201 criado com stationIds", async () => {
    setupSqlMock([
      [],
      [{ id: 1 }, { id: 2 }],
      [{ id: 10, name: "Temperatura", unit: "°C", symbol: "T" }],
      [],
    ]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "ADMIN" } });
    const res = await POST(
      req({
        name: "Temperatura",
        unit: "°C",
        symbol: "T",
        factor_value: 1,
        offset_value: 0,
        stationIds: [1, 2],
      }),
    );
    expect(res.status).toBe(201);
  });

  it("201 criado com stationId singular (sem stationIds)", async () => {
    setupSqlMock([
      [],
      [{ id: 3 }],
      [{ id: 11, name: "Umidade", unit: "%", symbol: "U" }],
      [],
    ]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "ADMIN" } });
    const res = await POST(
      req({ name: "Umidade", unit: "%", symbol: "U", stationId: 3 }),
    );
    expect(res.status).toBe(201);
  });

  it("201 combina stationIds e stationId sem duplicatas", async () => {
    setupSqlMock([
      [],
      [{ id: 1 }, { id: 2 }],
      [{ id: 12, name: "Pressão", unit: "hPa", symbol: "P" }],
      [],
    ]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "ADMIN" } });
    const res = await POST(
      req({
        name: "Pressão",
        unit: "hPa",
        symbol: "P",
        stationIds: [1, 2],
        stationId: 2,
      }),
    );
    expect(res.status).toBe(201);
  });

  it("500 erro interno no banco", async () => {
    setupSqlMock([new Error("db fail")]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "ADMIN" } });
    const res = await POST(
      req({ name: "Temperatura", unit: "°C", symbol: "T", stationIds: [1] }),
    );
    expect(res.status).toBe(500);
  });
});

describe("GET /api/parameter-types", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  it("401 não autenticado", async () => {
    setupSqlMock([]);
    (auth as jest.Mock).mockResolvedValueOnce(null);
    const res = await GET(getReq());
    expect(res.status).toBe(401);
  });

  it("400 id inválido (não numérico)", async () => {
    setupSqlMock([]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "USER" } });
    const res = await GET(getReq({ id: "abc" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/id inv[aá]lido/i);
  });

  it("404 tipo de parâmetro não encontrado por id", async () => {
    setupSqlMock([[]]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "USER" } });
    const res = await GET(getReq({ id: "999" }));
    expect(res.status).toBe(404);
  });

  it("200 retorna tipo de parâmetro por id sem estações vinculadas", async () => {
    setupSqlMock([
      [{ id: 1, name: "Temperatura", unit: "°C", symbol: "T" }],
      [],
    ]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "USER" } });
    const res = await GET(getReq({ id: "1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.currentStations).toEqual([]);
  });

  it("200 retorna tipo de parâmetro por id com estações", async () => {
    setupSqlMock([
      [{ id: 1, name: "Temperatura", unit: "°C", symbol: "T" }],
      [{ id_station: 2 }, { id_station: 5 }],
      [
        { id: 2, name: "S2" },
        { id: 5, name: "S5" },
      ],
    ]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "USER" } });
    const res = await GET(getReq({ id: "1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.currentStations).toHaveLength(2);
  });

  it("400 stationId inválido (não numérico)", async () => {
    setupSqlMock([]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "USER" } });
    const res = await GET(getReq({ stationId: "xyz" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/stationId inv[aá]lido/i);
  });

  it("200 stationId sem parâmetros ativos retorna lista vazia", async () => {
    setupSqlMock([[]]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "USER" } });
    const res = await GET(getReq({ stationId: "1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
  });

  it("200 listagem padrão sem filtros", async () => {
    setupSqlMock([
      [{ id: 1, name: "Temperatura", unit: "°C", symbol: "T" }],
      [{ count: "1" }],
      [{ id_parameter_type: 1, id_station: 2 }],
      [{ id: 2, name: "S2" }],
    ]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "USER" } });
    const res = await GET(getReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.pagination).toBeDefined();
    expect(body.data[0].linked_stations).toHaveLength(1);
  });

  it("200 listagem com search filtra por nome", async () => {
    setupSqlMock([
      [{ id: 2, name: "Umidade", unit: "%", symbol: "U" }],
      [{ count: "1" }],
      [],
      [],
    ]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "USER" } });
    const res = await GET(getReq({ search: "Umidade" }));
    expect(res.status).toBe(200);
  });

  it("200 listagem com limit=all sem paginação", async () => {
    setupSqlMock([[], [{ count: "0" }]]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "ADMIN" } });
    const res = await GET(getReq({ limit: "all" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.pagination.limit).toBe("all");
  });

  it("200 listagem com page e limit customizados", async () => {
    setupSqlMock([[], [{ count: "0" }]]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "USER" } });
    const res = await GET(getReq({ page: "2", limit: "5" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.pagination.page).toBe(2);
  });

  it("200 listagem com data vazia retorna data=[] sem buscar paramLinks", async () => {
    setupSqlMock([[], [{ count: "0" }]]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "USER" } });
    const res = await GET(getReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
  });

  it("200 filtro por stationId com parâmetros ativos", async () => {
    setupSqlMock([
      [{ id_parameter_type: 1 }, { id_parameter_type: 3 }],
      [
        { id: 1, name: "Temperatura", unit: "°C", symbol: "T" },
        { id: 3, name: "Pressão", unit: "hPa", symbol: "P" },
      ],
      [{ count: "2" }],
      [
        { id_parameter_type: 1, id_station: 5 },
        { id_parameter_type: 3, id_station: 5 },
      ],
      [{ id: 5, name: "S5" }],
    ]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "USER" } });
    const res = await GET(getReq({ stationId: "5" }));
    expect(res.status).toBe(200);
  });

  it("500 erro interno no banco", async () => {
    setupSqlMock([new Error("fail")]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "USER" } });
    const res = await GET(getReq());
    expect(res.status).toBe(500);
  });
});

describe("PUT /api/parameter-types", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  it("401 não autenticado", async () => {
    setupSqlMock([]);
    (auth as jest.Mock).mockResolvedValueOnce(null);
    const res = await PUT(req({ id: 1, name: "Temperatura" }));
    expect(res.status).toBe(401);
  });

  it("403 usuário sem permissão (role USER)", async () => {
    setupSqlMock([]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "USER" } });
    const res = await PUT(req({ id: 1, name: "Temperatura" }));
    expect(res.status).toBe(403);
  });

  it("400 id ausente", async () => {
    setupSqlMock([]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "ADMIN" } });
    const res = await PUT(req({ name: "Temperatura" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/id/i);
  });

  it("404 tipo de parâmetro não encontrado", async () => {
    setupSqlMock([[]]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "ADMIN" } });
    const res = await PUT(req({ id: 999, name: "X" }));
    expect(res.status).toBe(404);
  });

  it("200 atualiza campos sem mexer em estações (stationIds undefined)", async () => {
    setupSqlMock([
      [{ id: 1, name: "Temperatura Nova", unit: "°C", symbol: "T" }],
    ]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "ADMIN" } });
    const res = await PUT(req({ id: 1, name: "Temperatura Nova" }));
    expect(res.status).toBe(200);
  });

  it("400 stationIds contém estação inexistente", async () => {
    setupSqlMock([
      [{ id: 1, name: "Temperatura", unit: "°C", symbol: "T" }],
      [],
    ]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "ADMIN" } });
    const res = await PUT(req({ id: 1, stationIds: [999] }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/esta[çc][oõ]es/i);
  });

  it("200 atualiza com stationIds — insere novos, habilita inativos, desabilita removidos", async () => {
    setupSqlMock([
      [{ id: 1, name: "Temperatura", unit: "°C", symbol: "T" }],
      [{ id: 2 }, { id: 3 }],
      [
        { id: 10, id_station: 2, status: true },
        { id: 11, id_station: 4, status: true },
      ],
      [],
      [],
      [],
    ]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "ADMIN" } });
    const res = await PUT(req({ id: 1, stationIds: [2, 3] }));
    expect(res.status).toBe(200);
  });

  it("200 stationIds vazio desativa todos os vínculos", async () => {
    setupSqlMock([
      [{ id: 1, name: "Temperatura", unit: "°C", symbol: "T" }],
      [
        { id: 10, id_station: 2, status: true },
        { id: 11, id_station: 5, status: true },
      ],
      [],
    ]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "ADMIN" } });
    const res = await PUT(req({ id: 1, stationIds: [] }));
    expect(res.status).toBe(200);
  });

  it("200 stationId singular — vincula estação única", async () => {
    setupSqlMock([
      [{ id: 2, name: "Umidade", unit: "%", symbol: "U" }],
      [{ id: 7 }],
      [{ id: 20, id_station: 7, status: false }],
      [],
    ]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "ADMIN" } });
    const res = await PUT(req({ id: 2, stationId: 7 }));
    expect(res.status).toBe(200);
  });

  it("200 stationId null desvincula todas as estações", async () => {
    setupSqlMock([
      [{ id: 2, name: "Umidade", unit: "%", symbol: "U" }],
      [{ id: 20, id_station: 3, status: true }],
      [],
    ]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "ADMIN" } });
    const res = await PUT(req({ id: 2, stationId: null }));
    expect(res.status).toBe(200);
  });

  it("500 erro interno no banco", async () => {
    setupSqlMock([new Error("db fail")]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "ADMIN" } });
    const res = await PUT(req({ id: 1 }));
    expect(res.status).toBe(500);
  });
});
