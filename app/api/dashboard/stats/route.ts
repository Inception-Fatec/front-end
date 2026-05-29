import { auth } from "@/auth";
import sql from "@/lib/db-postgres";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  try {
    const [{ total_stations, active_stations, total_groups, last_update }] = await sql`
      SELECT
        (SELECT COUNT(*)::int FROM stations) as total_stations,
        (SELECT COUNT(*)::int FROM stations WHERE status = true) as active_stations,
        (SELECT COUNT(*)::int FROM groupings) as total_groups,
        (SELECT date_time FROM measurements ORDER BY date_time DESC LIMIT 1) as last_update
    `;

    return NextResponse.json({
      totalStations: total_stations ?? 0,
      activeStations: active_stations ?? 0,
      totalGroups: total_groups ?? 0,
      lastUpdate: last_update ?? "",
    }, { status: 200 });
  } catch (err) {
    console.error("[GET /api/dashboard/stats] error:", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}