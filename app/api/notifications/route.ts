import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import { AlertLogWithDetails } from "@/types/alert";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  try {
    const { data, error, count } = await supabaseAdmin
      .from("alert_logs")
      .select(`
        *,
        stations (name),
        parameters (id_parameter_type, parameter_types (name, unit, symbol)),
        user_alerts!inner ()
      `, { count: "exact" })
      .eq("user_alerts.id_user", session.user.id)
      .eq("user_alerts.seen", false)
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) throw error;

    return NextResponse.json({ data: data as AlertLogWithDetails[], count }, { status: 200 });

  } catch (error) {
    console.error("Erro no GET notifications:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  try {

    const { data, error } = await supabaseAdmin
      .from("user_alerts")
      .update({ seen: true })
      .eq("id_user", session.user.id)
      .eq("seen", false)
      .select();

    if (error || !data) {
      console.error("Erro ao atualizar seen:", error);
      return NextResponse.json({ error: "Erro ao atualizar alerta." }, { status: 500 });
    }

    return NextResponse.json(data, { status: 200 });

  } catch (error) {
    console.error("Erro no PATCH user_alerts:", error);
    return NextResponse.json({ error: "Erro interno ao atualizar." }, { status: 500 });
  }
}