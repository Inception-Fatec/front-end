import { auth } from "@/auth";
import sql from "@/lib/db-postgres";
import { NextRequest, NextResponse } from "next/server";
import { AlertSeverity, AlertOperator, Alert } from "@/types/alert";

const VALID_SEVERITIES: AlertSeverity[] = ["CRITICAL", "MODERATE", "MINOR"];
const VALID_OPERATORS: AlertOperator[] = [">", "<", ">=", "<=", "="];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.user.role === "USER")
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

  try {
    const body = await req.json();
    const { name, message, severity, operator, value, status, parameters } = body;

    if (!name || !message || !severity || !operator || !value || !Array.isArray(parameters) || parameters.length === 0)
      return NextResponse.json({ error: "Campos obrigatórios não fornecidos." }, { status: 400 });

    if (!VALID_SEVERITIES.includes(severity))
      return NextResponse.json({ error: `severity inválida.` }, { status: 400 });

    if (!VALID_OPERATORS.includes(operator))
      return NextResponse.json({ error: `operator inválido.` }, { status: 400 });

    const paramTypes = await sql`
      SELECT DISTINCT id_parameter_type FROM parameters WHERE id = ANY(${parameters})
    `;
    if (paramTypes.length > 1)
      return NextResponse.json({ error: "Todos os parâmetros devem ser do mesmo tipo." }, { status: 400 });

    const [alert] = await sql`
      INSERT INTO alerts (name, message, severity, operator, value, status)
      VALUES (${name}, ${message}, ${severity}, ${operator}, ${value}, ${status ?? true})
      RETURNING id, name, message, severity, operator, value, status
    `;

    await sql`
      INSERT INTO alert_parameters (id_alert, id_parameter)
      SELECT ${alert.id}, unnest(${parameters}::int[])
    `;

    return NextResponse.json(alert as Alert, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  try {
    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 10), 1), 50);
    const search = url.searchParams.get("search")?.trim() || "";
    const parameterType = Number(url.searchParams.get("parameterType") ?? 0);
    const severity = url.searchParams.get("severity")?.trim() || "";
    const offset = (page - 1) * limit;

    const searchFilter = search ? sql`AND a.name ILIKE ${"%" + search + "%"}` : sql``;
    const severityFilter = severity ? sql`AND a.severity = ${severity}` : sql``;
    const paramTypeFilter = parameterType ? sql`
      AND a.id IN (
        SELECT ap.id_alert FROM alert_parameters ap
        INNER JOIN parameters p ON p.id = ap.id_parameter
        WHERE p.id_parameter_type = ${parameterType}
      )
    ` : sql``;

    const data = await sql`
      SELECT
        a.*,
        json_agg(
          json_build_object(
            'id', ap.id,
            'id_alert', ap.id_alert,
            'id_parameter', ap.id_parameter,
            'parameters', json_build_object(
              'parameter_types', json_build_object('id', pt.id, 'name', pt.name, 'unit', pt.unit),
              'stations', json_build_object('id', s.id, 'name', s.name)
            )
          )
        ) as alert_parameters
      FROM alerts a
      LEFT JOIN alert_parameters ap ON ap.id_alert = a.id
      LEFT JOIN parameters p ON p.id = ap.id_parameter
      LEFT JOIN parameter_types pt ON pt.id = p.id_parameter_type
      LEFT JOIN stations s ON s.id = p.id_station
      WHERE 1=1 ${searchFilter} ${severityFilter} ${paramTypeFilter}
      GROUP BY a.id
      ORDER BY a.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [{ count }] = await sql`
      SELECT COUNT(DISTINCT a.id)::int as count FROM alerts a
      WHERE 1=1 ${searchFilter} ${severityFilter} ${paramTypeFilter}
    `;

    return NextResponse.json({
      data,
      pagination: { page, limit, total: count, totalPages: Math.ceil((count || 0) / limit) },
    }, { status: 200 });
  } catch (error) {
    console.error("Erro no GET alerts:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.user.role === "USER")
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

  try {
    const body = await req.json();
    const { id, name, message, severity, operator, value, status, parameters } = body;

    if (!id)
      return NextResponse.json({ error: "id é obrigatório." }, { status: 400 });
    if (!Array.isArray(parameters) || parameters.length === 0)
      return NextResponse.json({ error: "Pelo menos um parâmetro é obrigatório." }, { status: 400 });

    const paramTypes = await sql`
      SELECT DISTINCT id_parameter_type FROM parameters WHERE id = ANY(${parameters})
    `;
    if (paramTypes.length > 1)
      return NextResponse.json({ error: "Todos os parâmetros devem ser do mesmo tipo." }, { status: 400 });

    const [updated] = await sql`
      UPDATE alerts SET name=${name}, message=${message}, severity=${severity},
      operator=${operator}, value=${value}, status=${status}
      WHERE id = ${id} RETURNING *
    `;

    await sql`DELETE FROM alert_parameters WHERE id_alert = ${id}`;
    await sql`
      INSERT INTO alert_parameters (id_alert, id_parameter)
      SELECT ${id}, unnest(${parameters}::int[])
    `;

    return NextResponse.json(updated as Alert, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Erro interno ao atualizar." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { id, status } = await req.json();

  if (!id || status === undefined)
    return NextResponse.json({ error: "id e status são obrigatórios." }, { status: 400 });

  const [data] = await sql`
    UPDATE alerts SET status = ${status} WHERE id = ${id} RETURNING *
  `;

  if (!data)
    return NextResponse.json({ error: "Erro ao atualizar status." }, { status: 500 });

  return NextResponse.json(data, { status: 200 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.user.role === "USER")
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

  try {
    const { id } = await req.json();
    if (!id)
      return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });

    await sql`DELETE FROM alert_parameters WHERE id_alert = ${id}`;
    await sql`DELETE FROM alerts WHERE id = ${id}`;

    return NextResponse.json({ message: "Alerta deletado com sucesso" }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}