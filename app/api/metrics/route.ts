import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getMongoDb, logAudit } from "../../../lib/mongodb";

const MAX_PAYLOAD_BYTES = 2048;

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object" && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>).sort(
      ([a], [b]) => a.localeCompare(b),
    );
    return `{${entries
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

interface MetricsBody {
  stationId?: string;
  id_station?: string;
  payload: Record<string, unknown>;
  checksum: string;
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const payloadSize = Buffer.byteLength(rawBody, "utf8");

    if (payloadSize > MAX_PAYLOAD_BYTES) {
      await logAudit("payload_too_large", { size: payloadSize });
      return NextResponse.json(
        { error: "Payload excede o limite de 2 KB." },
        { status: 413 },
      );
    }

    let body: MetricsBody;
    try {
      body = JSON.parse(rawBody);
    } catch {
      await logAudit("invalid_json", { size: payloadSize });
      return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
    }

    const stationId = body.stationId ?? body.id_station;

    if (!stationId || body.payload === undefined || !body.checksum) {
      await logAudit("missing_fields", { stationId, size: payloadSize });
      return NextResponse.json(
        {
          error:
            "Dados incompletos (stationId, payload e checksum são obrigatórios).",
        },
        { status: 400 },
      );
    }

    const payloadToValidate = stableStringify(body.payload);
    const calculatedChecksum = createHash("sha256")
      .update(payloadToValidate)
      .digest("hex");

    const receivedChecksum = body.checksum.trim().toLowerCase();

    if (receivedChecksum !== calculatedChecksum) {
      await logAudit("integrity_failure", { stationId, size: payloadSize });
      return NextResponse.json(
        {
          error: "Falha de integridade (Checksum divergente).",
          expected: calculatedChecksum,
        },
        { status: 422 },
      );
    }

    const db = await getMongoDb();
    await db.collection("raw_measurements").insertOne({
      station_id: stationId,
      payload: body.payload,
      checksum_received: receivedChecksum,
      payload_size_bytes: payloadSize,
      received_at: new Date(),
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Erro na rota POST /api/metrics:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}
