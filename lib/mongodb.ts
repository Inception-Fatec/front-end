import { MongoClient, Db } from "mongodb";

const MONGO_URI = process.env.MONGODB_URI!;
const DB_NAME = "iot_raw_data";

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
    await database.collection("raw_payloads").insertOne({ ...dados });
  } catch (error) {
    console.error("[MongoDB] Erro ao salvar:", error);
  }
}
