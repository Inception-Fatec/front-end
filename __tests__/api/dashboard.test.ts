import { GET as getParameters } from "@/app/api/dashboard/parameters/route";
import { GET as getStats } from "@/app/api/dashboard/stats/route";
import { auth } from "@/auth";
import sql from "@/lib/db-postgres";
import { NextRequest } from "next/server";

jest.mock("@/lib/db-postgres");
jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({
      status: init?.status || 200,
      json: async () => body,
    })),
  },
}));

const mockSql = (sql as unknown as { __mockSql: jest.Mock }).__mockSql;

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

function req(url = "http://localhost/api/dashboard/parameters") {
  return { url } as unknown as NextRequest;
}

describe("/api/dashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (auth as jest.Mock).mockResolvedValue({ user: { id: 1, role: "ADMIN" } });
  });

  it("retorna estatisticas do dashboard", async () => {
    setupSqlMock([
      [
        {
          total_stations: 4,
          active_stations: 3,
          total_groups: 2,
          last_update: "2026-06-17T10:00:00.000Z",
        },
      ],
    ]);

    const res = await getStats();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({
      totalStations: 4,
      activeStations: 3,
      totalGroups: 2,
      lastUpdate: "2026-06-17T10:00:00.000Z",
    });
  });

  it("resume parametros recentes com media e series do periodo", async () => {
    setupSqlMock([
      [
        {
          id: 10,
          id_station: 1,
          name: "Temperatura",
          symbol: "C",
          factor_value: 1,
          offset_value: 0,
        },
      ],
      [
        {
          id_parameter: 10,
          value: 20,
          date_time: new Date().toISOString(),
        },
        {
          id_parameter: 10,
          value: 24,
          date_time: new Date().toISOString(),
        },
      ],
    ]);

    const res = await getParameters(
      req("http://localhost/api/dashboard/parameters?period=30min"),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json[0].name).toBe("Temperatura");
    expect(json[0].value).toBe(22);
    expect(json[0].color).toBe("#f97316");
    expect(json[0].chartData["30min"]).toHaveLength(6);
  });
});
