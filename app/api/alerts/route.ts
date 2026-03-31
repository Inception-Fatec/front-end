import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import { AlertSeverity, AlertOperator, AlertWithParameters, Alert } from "@/types/alert";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.user.role === "USER") return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

  try {
    const body: Pick<Alert, "name" | "message" | "severity" | "operator" | "value" | "status"> & { parameters: number[] } = await req.json();
    const { name, message, severity, operator, value, status, parameters } = body;

    if (!name || !message || !severity || !operator || !value || !Array.isArray(parameters) || parameters.length === 0) {
      return NextResponse.json({ error: "Campos obrigatórios não fornecidos." }, { status: 400 });
    }

    const validSeverities: AlertSeverity[] = ["CRITICAL", "MODERATE", "MINOR"];
    if (!validSeverities.includes(severity as AlertSeverity)) {
      return NextResponse.json({ error: `severity inválida. Valores aceitos: ${validSeverities.join(", ")}` }, { status: 400 });
    }

    const validOperators: AlertOperator[] = [">", "<", ">=", "<=", "="];
    if (!validOperators.includes(operator as AlertOperator)) {
      return NextResponse.json({ error: `operator inválido. Valores aceitos: ${validOperators.join(", ")}` }, { status: 400 });
    }

    const { data: parameterTypes, error: parameterError } = await supabaseAdmin
      .from("parameters")
      .select("id_parameter_type")
      .in("id", parameters);

    if (parameterError) {
      console.error("Supabase error ao validar parâmetros:", parameterError);
      return NextResponse.json({ error: "Erro ao validar parâmetros." }, { status: 500 });
    }

    const uniqueTypes = [...new Set(parameterTypes?.map(p => p.id_parameter_type))];

    if (uniqueTypes.length > 1) {
      return NextResponse.json({ error: "Todos os parâmetros devem ser do mesmo tipo." }, { status: 400 });
    }

    const { data: alert, error: alertError } = await supabaseAdmin
      .from("alerts")
      .insert({ name, message, severity, operator, value, status })
      .select("id, name, message, severity, operator, value, status")
      .maybeSingle();

    if (alertError || !alert) {
      console.error("Supabase error ao criar alerta:", alertError);
      return NextResponse.json({ error: "Erro ao criar alerta." }, { status: 500 });
    }

    const alertParameters = parameters.map((id_parameter: number) => ({
      id_alert: alert.id,
      id_parameter
    }));

    const { error: alertParameterError } = await supabaseAdmin
      .from("alert_parameters")
      .insert(alertParameters);

    if (alertParameterError) {
      console.error("Supabase error ao criar alert_parameter:", alertParameterError);
      return NextResponse.json({ error: "Erro ao criar alerta." }, { status: 500 });
    }

    return NextResponse.json(alert as Alert, { status: 201 });

  } catch {
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  try {
    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 10), 1), 50);

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabaseAdmin
      .from("alerts")
      .select(`
        *,
        alert_parameters (
          *,
          parameters (
            parameter_types ( * ),
            stations ( id, name )
          )
        )
      `, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;

    return NextResponse.json({
      data: data as AlertWithParameters[],
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil((count || 0) / limit),
      },
    }, { status: 200 });

  } catch (error) {
    console.error("Erro no GET alerts:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.user.role === "USER") return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

  try {
    const body: Pick<Alert, "id" | "name" | "message" | "severity" | "operator" | "value" | "status"> & { parameters: number[] } = await req.json();
    const { id, name, message, severity, operator, value, status, parameters } = body;

    if (!id) return NextResponse.json({ error: "id é obrigatório." }, { status: 400 });
    if (!Array.isArray(parameters) || parameters.length === 0) {
      return NextResponse.json({ error: "parameters é obrigatório." }, { status: 400 });
    }

    const validSeverities: AlertSeverity[] = ["CRITICAL", "MODERATE", "MINOR"];
    if (severity && !validSeverities.includes(severity as AlertSeverity)) {
      return NextResponse.json({ error: `severity inválida. Valores aceitos: ${validSeverities.join(", ")}` }, { status: 400 });
    }

    const validOperators: AlertOperator[] = [">", "<", ">=", "<=", "="];
    if (operator && !validOperators.includes(operator as AlertOperator)) {
      return NextResponse.json({ error: `operator inválido. Valores aceitos: ${validOperators.join(", ")}` }, { status: 400 });
    }

    const { data: parameterTypes, error: parameterError } = await supabaseAdmin
      .from("parameters")
      .select("id_parameter_type")
      .in("id", parameters);

    if (parameterError) {
      console.error("Supabase error ao validar parâmetros:", parameterError);
      return NextResponse.json({ error: "Erro ao validar parâmetros." }, { status: 500 });
    }

    const uniqueTypes = [...new Set(parameterTypes?.map(p => p.id_parameter_type))];
    if (uniqueTypes.length > 1) {
      return NextResponse.json({ error: "Todos os parâmetros devem ser do mesmo tipo." }, { status: 400 });
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("alerts")
      .update({ name, message, severity, operator, value, status })
      .eq("id", id)
      .select()
      .maybeSingle();

    if (updateError || !updated) {
      return NextResponse.json({ error: "Erro ao atualizar alerta." }, { status: 500 });
    }

    const { error: deleteError } = await supabaseAdmin
      .from("alert_parameters")
      .delete()
      .eq("id_alert", id);

    if (deleteError) {
      return NextResponse.json({ error: "Erro ao atualizar parâmetros." }, { status: 500 });
    }

    const alertParameters = parameters.map((id_parameter: number) => ({
      id_alert: id,
      id_parameter
    }));

    const { error: insertError } = await supabaseAdmin
      .from("alert_parameters")
      .insert(alertParameters);

    if (insertError) {
      return NextResponse.json({ error: "Erro ao atualizar parâmetros." }, { status: 500 });
    }

    return NextResponse.json(updated as Alert, { status: 200 });

  } catch {
    return NextResponse.json({ error: "Erro interno ao atualizar." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { id, status } = await req.json()

  if (!id || status === undefined) {
    return NextResponse.json({ error: "id e status são obrigatórios." }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from("alerts")
    .update({ status: status })
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Erro ao atualizar status." }, { status: 500 })
  }

  return NextResponse.json(data, { status: 200 })
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.user.role === "USER") return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

  try {
    const { id } = await req.json();

    if (!id) return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });

    const { error: alertParameterError } = await supabaseAdmin
      .from("alert_parameters")
      .delete()
      .eq("id_alert", id);

    if (alertParameterError) {
      console.error("Erro ao deletar alert_parameters:", alertParameterError);
      return NextResponse.json(
        { error: "Erro ao deletar alert_parameters" },
        { status: 500 }
      );
    }

    const { error } = await supabaseAdmin
      .from("alerts")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Erro ao deletar:", error);
      return NextResponse.json(
        { error: "Erro ao deletar alerta" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Alerta deletada com sucesso" },
      { status: 200 }
    );

  } catch {
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 }
    );
  }
}