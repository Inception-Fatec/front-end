import { supabaseAdmin } from "@/lib/supabase";
import { DateTime } from "luxon";

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE ?? "100");
const SLEEP_SECONDS = parseInt(process.env.SLEEP_SECONDS ?? "60");
const CACHE_RELOAD_INTERVAL =
  parseInt(process.env.CACHE_RELOAD_INTERVAL ?? "300") * 1000;

const MONGO_URI = process.env.MONGODB_URI!;
const MONGO_DB = process.env.MONGODB_DB_NAME || "api4";
const MONGO_COLLECTION = process.env.MONGODB_COLLECTION_NAME || "raw_payloads";

let mongoClient: any = null;

async function getCollection() {
  if (!mongoClient) {
    const { MongoClient } = require("mongodb");
    mongoClient = new MongoClient(MONGO_URI);
    await mongoClient.connect();
  }
  return mongoClient.db(MONGO_DB).collection(MONGO_COLLECTION);
}

let stationCache: Record<string, number> = {};
let parameterTypeCache: Record<string, number> = {};
let parameterCache: Record<string, number> = {};
let lastCacheReload = 0;

function parameterCacheKey(stationId: number, parameterTypeId: number): string {
  return `${stationId}:${parameterTypeId}`;
}

async function loadCaches(): Promise<void> {
  const { data: stations } = await supabaseAdmin
    .from("stations")
    .select("id,id_datalogger");
  stationCache = Object.fromEntries(
    (stations ?? []).map((s) => [s.id_datalogger, s.id]),
  );

  const { data: parameterTypes } = await supabaseAdmin
    .from("parameter_types")
    .select("id,json_name");
  parameterTypeCache = Object.fromEntries(
    (parameterTypes ?? []).map((pt) => [pt.json_name, pt.id]),
  );

  const { data: parameters } = await supabaseAdmin
    .from("parameters")
    .select("id,id_station,id_parameter_type");
  parameterCache = Object.fromEntries(
    (parameters ?? []).map((p) => [
      parameterCacheKey(p.id_station, p.id_parameter_type),
      p.id,
    ]),
  );

  lastCacheReload = Date.now();
}

async function reloadCachesIfNeeded(): Promise<void> {
  if (
    Date.now() - lastCacheReload >= CACHE_RELOAD_INTERVAL &&
    CACHE_RELOAD_INTERVAL > 0
  ) {
    await loadCaches();
  }
}

async function refreshStationCache(uid: string): Promise<number | null> {
  const { data } = await supabaseAdmin
    .from("stations")
    .select("id,id_datalogger")
    .eq("id_datalogger", uid)
    .single();

  if (data) {
    stationCache[data.id_datalogger] = data.id;
    return data.id;
  }
  return null;
}

async function refreshParameterTypeCache(
  jsonName: string,
): Promise<number | null> {
  const { data } = await supabaseAdmin
    .from("parameter_types")
    .select("id,json_name")
    .eq("json_name", jsonName)
    .single();

  if (data) {
    parameterTypeCache[data.json_name] = data.id;
    return data.id;
  }
  return null;
}

async function refreshParameterCache(
  stationId: number,
  parameterTypeId: number,
): Promise<number | null> {
  const { data } = await supabaseAdmin
    .from("parameters")
    .select("id,id_station,id_parameter_type")
    .eq("id_station", stationId)
    .eq("id_parameter_type", parameterTypeId)
    .single();

  if (data) {
    const key = parameterCacheKey(data.id_station, data.id_parameter_type);
    parameterCache[key] = data.id;
    return data.id;
  }
  return null;
}

async function processBatch(): Promise<number> {
  const collection = await getCollection();
  const documents = await collection.find().limit(BATCH_SIZE).toArray();

  let totalDocs = 0;
  let totalInserted = 0;
  const idsToDelete: object[] = [];

  for (const doc of documents) {
    totalDocs++;
    const docId = doc._id;
    const payload = doc.payload;

    try {
      const uid: string | undefined = payload.uid;
      const unixtime: number | undefined = payload.uxt;

      if (!uid || !unixtime) {
        idsToDelete.push(docId);
        continue;
      }

      const stationId = stationCache[uid] ?? (await refreshStationCache(uid));
      if (!stationId) {
        idsToDelete.push(docId);
        continue;
      }

      const dateTime = DateTime.fromSeconds(unixtime, {
        zone: "America/Sao_Paulo",
      }).toISO();

      const measurements: {
        id_parameter: number;
        value: unknown;
        date_time: string;
      }[] = [];

      for (const [key, value] of Object.entries(payload)) {
        if (["_id", "uid", "unixtime"].includes(key)) continue;

        const parameterTypeId =
          parameterTypeCache[key] ?? (await refreshParameterTypeCache(key));
        if (!parameterTypeId) continue;

        const cacheKey = parameterCacheKey(stationId, parameterTypeId);
        const parameterId =
          parameterCache[cacheKey] ??
          (await refreshParameterCache(stationId, parameterTypeId));
        if (!parameterId) continue;

        measurements.push({
          id_parameter: parameterId,
          value,
          date_time: dateTime!,
        });
      }

      if (measurements.length === 0) {
        idsToDelete.push(docId);
        continue;
      }

      const { error } = await supabaseAdmin
        .from("measurements")
        .upsert(measurements, { onConflict: "id_parameter,date_time" });

      if (error) {
        continue;
      } else {
        totalInserted += measurements.length;
        idsToDelete.push(docId);
      }
    } catch (err) {
      continue;
    }
  }

  if (idsToDelete.length > 0) {
    await collection.deleteMany({ _id: { $in: idsToDelete } });
  }

  return totalDocs;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sleepWithCountdown(seconds: number): Promise<void> {
  for (let remaining = seconds; remaining > 0; remaining--) {
    //process.stdout.write(`\rPróxima verificação em ${remaining}s  `);
    await sleep(1000);
  }
  process.stdout.write("\r" + " ".repeat(40) + "\r");
}

export async function main(): Promise<void> {
  await loadCaches();

  while (true) {
    try {
      await reloadCachesIfNeeded();
      let totalProcessed = 0;

      while (true) {
        const count = await processBatch();
        totalProcessed += count;

        if (count < BATCH_SIZE) break;

        await sleep(200);
      }

      if (totalProcessed === 0) {
        await sleepWithCountdown(SLEEP_SECONDS);
      } else {
        continue;
      }
    } catch (err) {
      continue;
    }
  }
}

main().catch((err) => {
  process.exit(1);
});
