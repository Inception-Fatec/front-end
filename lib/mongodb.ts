<<<<<<< HEAD
import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME ?? "api4";

type MongoGlobal = typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>;
};

const globalForMongo = globalThis as MongoGlobal;

function getClientPromise(): Promise<MongoClient> {
  if (!uri) {
    throw new Error("MONGODB_URI não configurada.");
  }

  if (!globalForMongo._mongoClientPromise) {
    const client = new MongoClient(uri);
    globalForMongo._mongoClientPromise = client.connect();
  }

  return globalForMongo._mongoClientPromise as Promise<MongoClient>;
}

export async function getMongoDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db(dbName);
=======
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
>>>>>>> d1effd2669554abf1124d73eb1735aa3a23a617f
}
