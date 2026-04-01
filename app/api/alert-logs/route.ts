import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import { AlertLogWithDetails } from "@/types/alert";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);

    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 5), 1), 50);
    const all = searchParams.get("all") === "true";

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabaseAdmin
      .from("alert_logs")
      .select(`
    *,
    stations (name),
    parameters (id_parameter_type, parameter_types (name, unit, symbol)),
    user_alerts${all ? "!left" : "!inner"} ( id_user, seen )
  `, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (!all) {
      query = query.eq("user_alerts.id_user", session.user.id).eq("user_alerts.seen", false);
    }

    const { data, error, count } = await query;
    if (error) throw error;
    console.log("Alert logs fetched:", { data, count });
    return NextResponse.json({
      data: data as AlertLogWithDetails[],
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil((count || 0) / limit),
      }
    }, { status: 200 });

  } catch (error) {
    console.error("Erro no GET notifications:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  try {
    const { id } = await req.json();

    let data, error;

    if (!id) {
      ({ data, error } = await supabaseAdmin
        .from("user_alerts")
        .update({ seen: true })
        .eq("id_user", session.user.id)
        .eq("seen", false)
        .select());
    } else {
      ({ data, error } = await supabaseAdmin
        .from("user_alerts")
        .update({ seen: true })
        .eq("id_user", session.user.id)
        .eq("id_alert_log", id)
        .select());
    }

    if (error) throw error;

    return NextResponse.json(data, { status: 200 });

  } catch (error) {
    console.error("Erro no PATCH user_alerts:", error);
    return NextResponse.json({ error: "Erro interno ao atualizar." }, { status: 500 });
  }
}