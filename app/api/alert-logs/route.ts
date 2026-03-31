import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import { AlertLogWithDetails } from "@/types/alert";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  try {
    const { data, error } = await supabaseAdmin
      .from("alert_logs")
      .select(`
        *,
        stations ( name ),
        parameters (
          id_parameter_type,
          parameter_types ( name, unit, symbol )
        )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(data as AlertLogWithDetails[], { status: 200 });

  } catch (error) {
    console.error("Erro no GET alert_logs:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}