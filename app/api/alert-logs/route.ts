import { auth } from "@/auth";
import sql from "@/lib/db-postgres";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const all = searchParams.get("all") === "true";
    const limit = Math.min(
      Math.max(Number(searchParams.get("limit") || 5), 1),
      50,
    );
    const search = searchParams.get("search") || "";
    const parameterType = Number(searchParams.get("parameterType") || 0);
    const severity = searchParams.get("severity") || "";
    const station = searchParams.get("station") || "";
    const offset = (page - 1) * limit;

    const searchFilter = search
      ? sql`AND s.name ILIKE ${"%" + search + "%"}`
      : sql``;
    const paramTypeFilter = parameterType
      ? sql`AND p.id_parameter_type = ${parameterType}`
      : sql``;
    const severityFilter = severity
      ? sql`AND al.severity = ${severity}`
      : sql``;
    const stationFilter =
      station && station !== "0"
        ? sql`AND al.id_station = ${Number(station)}`
        : sql``;
    const userFilter = all
      ? sql``
      : sql`
      INNER JOIN user_alerts ua ON ua.id_alert_log = al.id
      AND ua.id_user = ${session.user.id} AND ua.seen = false
    `;

    const data = await sql`
      SELECT
        al.*,
        json_build_object('name', s.name) as stations,
        json_build_object(
          'id_parameter_type', p.id_parameter_type,
          'parameter_types', json_build_object('name', pt.name, 'unit', pt.unit, 'symbol', pt.symbol)
        ) as parameters
      FROM alert_logs al
      LEFT JOIN stations s ON s.id = al.id_station
      LEFT JOIN parameters p ON p.id = al.id_parameter
      LEFT JOIN parameter_types pt ON pt.id = p.id_parameter_type
      ${userFilter}
      WHERE 1=1 ${searchFilter} ${paramTypeFilter} ${severityFilter} ${stationFilter}
      ORDER BY al.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [{ count }] = await sql`
      SELECT COUNT(*)::int as count
      FROM alert_logs al
      LEFT JOIN stations s ON s.id = al.id_station
      LEFT JOIN parameters p ON p.id = al.id_parameter
      ${userFilter}
      WHERE 1=1 ${searchFilter} ${paramTypeFilter} ${severityFilter} ${stationFilter}
    `;

    return NextResponse.json(
      {
        data,
        pagination: {
          page,
          limit,
          total: count ?? 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Erro no GET alert-logs:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  try {
    const { id } = await req.json();

    if (!id) {
      await sql`
        UPDATE user_alerts SET seen = true
        WHERE id_user = ${session.user.id} AND seen = false
      `;
    } else {
      await sql`
        UPDATE user_alerts SET seen = true
        WHERE id_user = ${session.user.id} AND id_alert_log = ${id}
      `;
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Erro no PATCH user_alerts:", error);
    return NextResponse.json(
      { error: "Erro interno ao atualizar." },
      { status: 500 },
    );
  }
}
