import {
  DELETE as deleteAlert,
  GET,
  PATCH,
  POST,
  PUT,
} from "@/app/api/alerts/route";
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

function req(body: unknown, url = "http://localhost/api/alerts") {
  return {
    url,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
}

describe("/api/alerts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (auth as jest.Mock).mockResolvedValue({ user: { id: 1, role: "ADMIN" } });
  });

  it("cria alerta com dados validos", async () => {
    const created = {
      id: 99,
      name: "Chuva critica",
      message: "Volume acima do limite",
      severity: "CRITICAL",
      operator: ">=",
      value: 80,
      status: true,
    };
    setupSqlMock([[{ id_parameter_type: 1 }], [created], []]);

    const res = await POST(
      req({
        name: "Chuva critica",
        message: "Volume acima do limite",
        severity: "CRITICAL",
        operator: ">=",
        value: 80,
        status: true,
        parameters: [11, 12],
      }),
    );
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json).toEqual(created);
    expect(mockSql).toHaveBeenCalledTimes(3);
  });

  it("bloqueia criacao sem autenticacao", async () => {
    setupSqlMock([]);
    (auth as jest.Mock).mockResolvedValueOnce(null);

    const res = await POST(req({}));

    expect(res.status).toBe(401);
  });

  it("bloqueia criacao para usuario comum", async () => {
    setupSqlMock([]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "USER" } });

    const res = await POST(req({}));

    expect(res.status).toBe(403);
  });

  it("rejeita criacao com campos obrigatorios faltando", async () => {
    setupSqlMock([]);

    const res = await POST(req({ name: "Incompleto" }));

    expect(res.status).toBe(400);
  });

  it("rejeita criacao com severidade invalida", async () => {
    setupSqlMock([]);

    const res = await POST(
      req({
        name: "Chuva",
        message: "Mensagem",
        severity: "HIGH",
        operator: ">",
        value: 10,
        parameters: [1],
      }),
    );

    expect(res.status).toBe(400);
    expect(mockSql).not.toHaveBeenCalled();
  });

  it("rejeita criacao com operador invalido", async () => {
    setupSqlMock([]);

    const res = await POST(
      req({
        name: "Chuva",
        message: "Mensagem",
        severity: "MINOR",
        operator: "!=",
        value: 10,
        parameters: [1],
      }),
    );

    expect(res.status).toBe(400);
  });

  it("rejeita criacao quando parametros sao de tipos diferentes", async () => {
    setupSqlMock([[{ id_parameter_type: 1 }, { id_parameter_type: 2 }]]);

    const res = await POST(
      req({
        name: "Chuva",
        message: "Mensagem",
        severity: "MINOR",
        operator: ">",
        value: 10,
        parameters: [1, 2],
      }),
    );

    expect(res.status).toBe(400);
  });

  it("retorna 500 quando criacao falha no banco", async () => {
    setupSqlMock([new Error("db down")]);

    const res = await POST(
      req({
        name: "Chuva",
        message: "Mensagem",
        severity: "MINOR",
        operator: ">",
        value: 10,
        parameters: [1],
      }),
    );

    expect(res.status).toBe(500);
  });

  it("lista alertas filtrando por severidade moderada", async () => {
    const data = [
      {
        id: 3,
        name: "Temperatura moderada",
        severity: "MODERATE",
        alert_parameters: [],
      },
    ];
    setupSqlMock([data, [{ count: 1 }]]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { id: 2, role: "USER" } });

    const res = await GET(
      req(undefined, "http://localhost/api/alerts?severity=MODERATE&page=1"),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toEqual(data);
    expect(json.pagination.totalPages).toBe(1);
  });

  it("bloqueia listagem sem autenticacao", async () => {
    setupSqlMock([]);
    (auth as jest.Mock).mockResolvedValueOnce(null);

    const res = await GET(req(undefined));

    expect(res.status).toBe(401);
  });

  it("retorna 500 quando listagem falha", async () => {
    setupSqlMock([new Error("db down")]);
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    const res = await GET(req(undefined));

    expect(res.status).toBe(500);
    consoleSpy.mockRestore();
  });

  it("atualiza estado de Critico para Moderado", async () => {
    const updated = {
      id: 5,
      name: "Nivel do rio",
      message: "Reduziu severidade",
      severity: "MODERATE",
      operator: ">",
      value: 60,
      status: true,
    };
    setupSqlMock([[{ id_parameter_type: 1 }], [updated], [], []]);

    const res = await PUT(
      req({
        id: 5,
        name: "Nivel do rio",
        message: "Reduziu severidade",
        severity: "MODERATE",
        operator: ">",
        value: 60,
        status: true,
        parameters: [15],
      }),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.severity).toBe("MODERATE");
  });

  it("bloqueia atualizacao sem autenticacao", async () => {
    setupSqlMock([]);
    (auth as jest.Mock).mockResolvedValueOnce(null);

    const res = await PUT(req({}));

    expect(res.status).toBe(401);
  });

  it("bloqueia atualizacao para usuario comum", async () => {
    setupSqlMock([]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "USER" } });

    const res = await PUT(req({}));

    expect(res.status).toBe(403);
  });

  it("rejeita atualizacao sem id", async () => {
    setupSqlMock([]);

    const res = await PUT(req({ parameters: [1] }));

    expect(res.status).toBe(400);
  });

  it("rejeita atualizacao sem parametros", async () => {
    setupSqlMock([]);

    const res = await PUT(req({ id: 5, parameters: [] }));

    expect(res.status).toBe(400);
  });

  it("rejeita atualizacao com parametros de tipos diferentes", async () => {
    setupSqlMock([[{ id_parameter_type: 1 }, { id_parameter_type: 2 }]]);

    const res = await PUT(req({ id: 5, parameters: [1, 2] }));

    expect(res.status).toBe(400);
  });

  it("retorna 500 quando atualizacao falha", async () => {
    setupSqlMock([new Error("db down")]);

    const res = await PUT(req({ id: 5, parameters: [1] }));

    expect(res.status).toBe(500);
  });

  it("ativa ou desativa alerta pelo PATCH", async () => {
    const updated = { id: 5, status: false, severity: "CRITICAL" };
    setupSqlMock([[updated]]);

    const res = await PATCH(req({ id: 5, status: false }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe(false);
  });

  it("rejeita PATCH sem id ou status", async () => {
    setupSqlMock([]);

    const res = await PATCH(req({ id: 5 }));

    expect(res.status).toBe(400);
  });

  it("retorna 500 quando PATCH nao encontra alerta", async () => {
    setupSqlMock([[]]);

    const res = await PATCH(req({ id: 5, status: true }));

    expect(res.status).toBe(500);
  });

  it("remove alerta existente", async () => {
    setupSqlMock([[], []]);

    const res = await deleteAlert(req({ id: 5 }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toContain("sucesso");
  });

  it("bloqueia remocao sem autenticacao", async () => {
    setupSqlMock([]);
    (auth as jest.Mock).mockResolvedValueOnce(null);

    const res = await deleteAlert(req({ id: 5 }));

    expect(res.status).toBe(401);
  });

  it("bloqueia remocao para usuario comum", async () => {
    setupSqlMock([]);
    (auth as jest.Mock).mockResolvedValueOnce({ user: { role: "USER" } });

    const res = await deleteAlert(req({ id: 5 }));

    expect(res.status).toBe(403);
  });

  it("rejeita remocao sem id", async () => {
    setupSqlMock([]);

    const res = await deleteAlert(req({}));

    expect(res.status).toBe(400);
  });

  it("retorna 500 quando remocao falha", async () => {
    setupSqlMock([new Error("db down")]);

    const res = await deleteAlert(req({ id: 5 }));

    expect(res.status).toBe(500);
  });
});
