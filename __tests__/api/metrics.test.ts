import { createHash } from "crypto";
import { POST } from "../../app/api/metrics/route";
import { NextRequest } from "next/server";

const mockInsertOne = jest.fn();
const mockGetMongoDb = jest.fn();

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((body, init) => {
      return {
        status: init?.status || 200,
        json: async () => body,
      };
    }),
  },
}));

jest.mock("../../lib/mongodb", () => ({
  getMongoDb: jest.fn(() => mockGetMongoDb()),
}));

function createMockRequestFromText(text: string) {
  return {
    text: jest.fn().mockResolvedValue(text),
  } as unknown as NextRequest;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(
      ([a], [b]) => a.localeCompare(b),
    );
    return `{${entries
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function checksumForPayload(payload: unknown) {
  return createHash("sha256").update(stableStringify(payload)).digest("hex");
}

describe("POST /api/metrics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMongoDb.mockResolvedValue({
      collection: jest.fn(() => ({
        insertOne: mockInsertOne,
      })),
    });
    mockInsertOne.mockResolvedValue({ acknowledged: true });
  });

  it("deve retornar 413 e gravar log quando o payload excede 2KB", async () => {
    const oversizedText = "a".repeat(2050);
    const req = createMockRequestFromText(oversizedText);

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(413);
    expect(json.error).toContain("2 KB");
    // Agora validamos que ele CHAMOU o banco para gravar o log de auditoria
    expect(mockInsertOne).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "payload_too_large", event: "ingestion_failure" })
    );
  });

  it("deve retornar 400 e gravar log quando stationId estiver ausente", async () => {
    const payload = { temperature: 23.4 };
    const checksum = checksumForPayload(payload);

    const req = createMockRequestFromText(
      JSON.stringify({ payload, checksum })
    );

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("stationId");
    expect(mockInsertOne).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "missing_fields" })
    );
  });

  it("deve retornar 400 quando checksum estiver ausente", async () => {
    const req = createMockRequestFromText(
      JSON.stringify({
        stationId: "estacao-01",
        payload: { temperature: 23.4 },
      }),
    );

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("obrigatórios");
    expect(mockInsertOne).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "missing_fields" })
    );
  });

  it("deve retornar 422 quando o checksum for mal formatado ou inválido", async () => {
    const req = createMockRequestFromText(
      JSON.stringify({
        stationId: "estacao-01",
        payload: { temperature: 23.4 },
        checksum: "1234",
      }),
    );

    const res = await POST(req);
    const json = await res.json();

    // Sua API atual cai na falha de integridade (422)
    expect(res.status).toBe(422);
    expect(json.error).toContain("integridade");
    expect(mockInsertOne).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "integrity_failure" })
    );
  });

  it("deve retornar 422 quando checksum for divergente", async () => {
    const req = createMockRequestFromText(
      JSON.stringify({
        stationId: "estacao-01",
        payload: { temperature: 23.4 },
        checksum: "f".repeat(64),
      }),
    );

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.error).toContain("integridade");
    expect(mockInsertOne).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "integrity_failure" })
    );
  });

  it("deve persistir em raw_measurements quando tudo estiver válido", async () => {
    const payload = { humidity: 81, temperature: 23.4 };
    const checksum = checksumForPayload(payload);

    const req = createMockRequestFromText(
      JSON.stringify({
        stationId: "estacao-01",
        payload,
        checksum,
      }),
    );

    const res = await POST(req);

    expect(res.status).toBe(201);
    expect(mockInsertOne).toHaveBeenCalledTimes(1);
    expect(mockInsertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        station_id: "estacao-01",
        payload,
        checksum_received: checksum,
        payload_size_bytes: expect.any(Number),
      }),
    );
  });
});