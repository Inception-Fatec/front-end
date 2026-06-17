import { GET } from "@/app/api/events/route";
import { auth } from "@/auth";
import { Client } from "pg";
import { ReadableStream } from "stream/web";
import { TextDecoder, TextEncoder } from "util";

(global as unknown as { TextEncoder: typeof TextEncoder }).TextEncoder =
  TextEncoder;
(global as unknown as { TextDecoder: typeof TextDecoder }).TextDecoder =
  TextDecoder;
(global as unknown as { ReadableStream: typeof ReadableStream }).ReadableStream =
  ReadableStream;
(global as unknown as { Response: typeof Response }).Response = (class {
  body: ReadableStream;
  headers: Headers;
  status: number;

  constructor(body: ReadableStream, init?: ResponseInit) {
    this.body = body;
    this.headers = new Headers(init?.headers);
    this.status = init?.status ?? 200;
  }
} as unknown) as typeof Response;

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({
      status: init?.status || 200,
      json: async () => body,
    })),
  },
}));

const mockConnect = jest.fn();
const mockQuery = jest.fn();
const mockEnd = jest.fn();
const handlers: Record<string, (msg?: unknown) => void> = {};
const mockOn = jest.fn((event: string, cb: (msg?: unknown) => void) => {
  handlers[event] = cb;
});

jest.mock("pg", () => ({
  Client: jest.fn().mockImplementation(() => ({
    connect: mockConnect,
    query: mockQuery,
    end: mockEnd,
    on: mockOn,
  })),
}));

describe("GET /api/events", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(handlers).forEach((key) => delete handlers[key]);
    mockConnect.mockResolvedValue(undefined);
    mockQuery.mockResolvedValue(undefined);
    mockEnd.mockResolvedValue(undefined);
  });

  it("retorna 401 quando nao autenticado", async () => {
    (auth as jest.Mock).mockResolvedValueOnce(null);

    const res = await GET();

    expect(res.status).toBe(401);
    expect(Client).not.toHaveBeenCalled();
  });

  it("escuta canais de eventos e envia notificacao SSE", async () => {
    (auth as jest.Mock).mockResolvedValueOnce({ user: { id: 1 } });

    const res = await GET();
    const reader = res.body!.getReader();

    handlers.notification({
      channel: "alert_logs_channel",
      payload: JSON.stringify({ id: 10, severity: "CRITICAL" }),
    });

    const chunk = await reader.read();
    const eventText = new TextDecoder().decode(chunk.value);
    await reader.cancel();

    expect(mockQuery).toHaveBeenCalledWith("LISTEN alert_logs_channel");
    expect(mockQuery).toHaveBeenCalledWith("LISTEN stations_channel");
    expect(mockQuery).toHaveBeenCalledWith("LISTEN measurements_channel");
    expect(mockQuery).toHaveBeenCalledWith("LISTEN groupings_channel");
    expect(eventText).toContain("alert_logs_channel");
    expect(eventText).toContain("CRITICAL");
    expect(mockEnd).toHaveBeenCalled();
  });

  it("envia heartbeat SSE enquanto a conexao esta aberta", async () => {
    jest.useFakeTimers();
    (auth as jest.Mock).mockResolvedValueOnce({ user: { id: 1 } });

    const res = await GET();
    const reader = res.body!.getReader();
    const readPromise = reader.read();

    jest.advanceTimersByTime(30_000);
    const chunk = await readPromise;
    const eventText = new TextDecoder().decode(chunk.value);
    await reader.cancel();
    jest.useRealTimers();

    expect(eventText).toBe(": ping\n\n");
  });

  it("fecha stream quando o cliente postgres emite erro", async () => {
    (auth as jest.Mock).mockResolvedValueOnce({ user: { id: 1 } });

    const res = await GET();
    const reader = res.body!.getReader();

    handlers.error();
    const chunk = await reader.read();

    expect(chunk.done).toBe(true);
  });

  it("ignora notificacao com payload invalido", async () => {
    (auth as jest.Mock).mockResolvedValueOnce({ user: { id: 1 } });

    const res = await GET();
    const reader = res.body!.getReader();

    expect(() =>
      handlers.notification({
        channel: "alert_logs_channel",
        payload: "{invalid",
      }),
    ).not.toThrow();
    await reader.cancel();
  });
});
