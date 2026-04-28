import { createHash } from "crypto";
import { POST } from "../../app/api/metrics/route";
import { NextRequest } from "next/server";

const mockInsertOne = jest.fn();
const mockGetMongoDb = jest.fn();

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({
      status: init?.status || 200,
      json: async () => body,
    })),
  },
}));

jest.mock("../../lib/mongodb", () => ({
  getMongoDb: jest.fn(() => mockGetMongoDb()),
  logAudit: jest.fn((reason, details) =>
    mockInsertOne({
      event: "ingestion_failure",
      reason,
      ...details,
    }),
  ),
}));

function createMockRequestFromText(text: string) {
  return { text: jest.fn().mockResolvedValue(text) } as unknown as NextRequest;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value))
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(
      ([a], [b]) => a.localeCompare(b),
    );
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

describe("POST /api/metrics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMongoDb.mockResolvedValue({
      collection: jest.fn(() => ({ insertOne: mockInsertOne })),
    });
    mockInsertOne.mockResolvedValue({ acknowledged: true });
  });

  it("deve retornar 413 e gravar log de auditoria quando o payload excede 2KB", async () => {
    const bigData = "a".repeat(2050);
    const req = createMockRequestFromText(bigData);

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(413);
    expect(json.error).toContain("2 KB");
    expect(mockInsertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: "payload_too_large",
      }),
    );
  });

  it("deve retornar 422 quando o checksum for inválido", async () => {
    const payload = { temperature: 25 };
    const req = createMockRequestFromText(
      JSON.stringify({
        stationId: "estacao-01",
        payload,
        checksum: "hash-errado",
      }),
    );

    const res = await POST(req);

    expect(res.status).toBe(422);
    expect(mockInsertOne).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "integrity_failure" }),
    );
  });

  it("deve persistir em raw_measurements quando os dados forem válidos", async () => {
    const payload = { humidity: 80, temperature: 22 };
    const checksum = createHash("sha256")
      .update(stableStringify(payload))
      .digest("hex");

    const req = createMockRequestFromText(
      JSON.stringify({
        stationId: "estacao-99",
        payload,
        checksum,
      }),
    );

    const res = await POST(req);

    expect(res.status).toBe(201);
    expect(mockInsertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        station_id: "estacao-99",
        payload: payload,
        checksum_received: checksum,
      }),
    );
  });
});
