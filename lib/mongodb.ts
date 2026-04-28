import { MongoClient, Db } from "mongodb";

const MONGO_URI = process.env.MONGODB_URI!;
const DB_NAME = process.env.MONGODB_DB_NAME || "api4";

let clientMongo: MongoClient | null = null;
let db: Db | null = null;

export async function getMongoDb(): Promise<Db> {
  if (db) return db;

  clientMongo = new MongoClient(MONGO_URI);
  await clientMongo.connect();
  db = clientMongo.db(DB_NAME);
  return db;
}

export async function saveRawData(dados: {
  topic: string;
  payload: Record<string, unknown>;
}): Promise<void> {
  try {
    const database = await getMongoDb();
    await database.collection("raw_payloads").insertOne({
      ...dados,
      received_at: new Date(),
    });
  } catch (error) {
    console.error("[MongoDB] Erro ao salvar payload bruto:", error);
  }
}

export async function logAudit(
  reason: string,
  details: { stationId?: string | number; size: number },
): Promise<void> {
  try {
    const database = await getMongoDb();
    await database.collection("audit_logs").insertOne({
      event: "ingestion_failure",
      reason,
      station_id: details.stationId || "unknown",
      payload_size_bytes: details.size,
      received_at: new Date(),
    });
  } catch (error) {
    console.error("[MongoDB] Erro ao gravar auditoria:", error);
  }
}
