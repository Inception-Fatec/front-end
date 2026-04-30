import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";
import type { DashboardStats } from "@/types/dashboard";

export async function GET() {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  try {
    const [
      { count: totalStations, error: e1 },
      { count: activeStations, error: e2 },
      { count: totalGroups, error: e3 },
      { data: date_time, error: e4 },
    ] = await Promise.all([
      supabaseAdmin
        .from("stations")
        .select("*", { count: "exact", head: true }),

      supabaseAdmin
        .from("stations")
        .select("*", { count: "exact", head: true })
        .eq("status", true),

      supabaseAdmin
        .from("groupings")
        .select("*", { count: "exact", head: true }),

      supabaseAdmin
        .from("measurements")
        .select("date_time")
        .order("date_time", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (e1) throw e1;
    if (e2) throw e2;
    if (e3) throw e3;
    if (e4) throw e4;

    return NextResponse.json(
      {
        totalStations: totalStations ?? 0,
        activeStations: activeStations ?? 0,
        totalGroups: totalGroups ?? 0,
        lastUpdate: date_time?.date_time ?? "",
      } satisfies DashboardStats,
      { status: 200 },
    );
  } catch (err) {
    console.error("[GET /api/dashboard/stats] error:", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
