import { GET, PATCH } from "@/app/api/alert-logs/route";
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

function req(body?: unknown, url = "http://localhost/api/alert-logs") {
  return {
    url,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
}

describe("/api/alert-logs", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 8, role: "OPERATOR" },
    });
  });

  it("lista logs criticos nao lidos do usuario", async () => {
    const logs = [
      {
        id: 1,
        id_station: 2,
        id_parameter: 3,
        measurement: 92,
        severity: "CRITICAL",
        message: "Chuva critica",
      },
    ];
    setupSqlMock([logs, [{ count: 1 }]]);

    const res = await GET(
      req(undefined, "http://localhost/api/alert-logs?severity=CRITICAL"),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toEqual(logs);
    expect(json.pagination.total).toBe(1);
  });

  it("marca um alerta como visto", async () => {
    setupSqlMock([[]]);

    const res = await PATCH(req({ id: 1 }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });

  it("marca todos os alertas como vistos quando id nao e enviado", async () => {
    setupSqlMock([[]]);

    const res = await PATCH(req({}));

    expect(res.status).toBe(200);
    expect(mockSql).toHaveBeenCalledTimes(1);
  });
});
