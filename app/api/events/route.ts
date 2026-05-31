import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { Client } from "pg";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const client = new Client({
    host: process.env.PG_HOST!,
    port: 5432,
    database: process.env.PG_DB!,
    user: process.env.PG_USER!,
    password: process.env.PG_PASSWORD!,
    ssl: false,
  });

  await client.connect();
  await client.query("LISTEN alert_logs_channel");
  await client.query("LISTEN stations_channel");
  await client.query("LISTEN measurements_channel");
  await client.query("LISTEN groupings_channel");

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      // Heartbeat a cada 30s para manter a conexão viva
      const heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          clearInterval(heartbeat);
        }
      }, 30_000);

      client.on("notification", (msg) => {
        if (closed) return;
        try {
          const data = JSON.stringify({
            channel: msg.channel,
            payload: msg.payload ? JSON.parse(msg.payload) : null,
          });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch {
          // payload não é JSON válido — ignora
        }
      });

      client.on("error", () => {
        clearInterval(heartbeat);
        if (!closed) {
          closed = true;
          controller.close();
        }
      });

      // Cleanup quando o cliente fechar a conexão
      return () => {
        closed = true;
        clearInterval(heartbeat);
        client.end().catch(() => {});
      };
    },
    cancel() {
      closed = true;
      client.end().catch(() => {});
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
