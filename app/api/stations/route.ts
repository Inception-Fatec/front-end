import { auth } from "@/auth";
import sql from "@/lib/db-postgres";
import { NextRequest, NextResponse } from "next/server";

async function fetchAllMeasurements(
  parameterId: number,
  startDate: string | null,
  endDate: string,
) {
  const start = startDate ? sql`AND date_time >= ${startDate}` : sql``;
  return await sql`
    SELECT id, value, date_time FROM measurements
    WHERE id_parameter = ${parameterId}
    AND date_time <= ${endDate}
    ${start}
    ORDER BY date_time ASC
  `;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

  try {
    const body = await req.json();
    const {
      name,
      id_datalogger,
      address,
      latitude,
      longitude,
      parameters,
      groupings,
    } = body;

    if (!name || !id_datalogger)
      return NextResponse.json(
        { error: "Todos os campos são obrigatórios." },
        { status: 400 },
      );

    const existingName =
      await sql`SELECT id FROM stations WHERE name = ${name} LIMIT 1`;
    if (existingName.length > 0)
      return NextResponse.json({ error: "Nome já em uso." }, { status: 409 });

    const existingDatalogger =
      await sql`SELECT id FROM stations WHERE id_datalogger = ${id_datalogger} LIMIT 1`;
    if (existingDatalogger.length > 0)
      return NextResponse.json(
        { error: "Datalogger já está em uso por outra estação." },
        { status: 409 },
      );

    if (Array.isArray(groupings) && groupings.length > 0) {
      const valid =
        await sql`SELECT id FROM groupings WHERE id = ANY(${groupings})`;
      if (valid.length !== groupings.length)
        return NextResponse.json(
          { error: "Um ou mais grupos informados não existem no sistema." },
          { status: 400 },
        );
    }

    const [station] = await sql`
      INSERT INTO stations (name, id_datalogger, address, latitude, longitude, status)
      VALUES (${name}, ${id_datalogger}, ${address ?? null}, ${latitude ?? null}, ${longitude ?? null}, true)
      RETURNING id
    `;

    if (Array.isArray(parameters) && parameters.length > 0) {
      await sql`
        INSERT INTO parameters (id_station, id_parameter_type, status)
        SELECT ${station.id}, unnest(${parameters}::int[]), true
      `;
    }

    if (Array.isArray(groupings) && groupings.length > 0) {
      await sql`
        INSERT INTO station_groupings (id_station, id_grouping)
        SELECT ${station.id}, unnest(${groupings}::int[])
      `;
    }

    const [result] = await sql`
      SELECT s.*,
        json_agg(DISTINCT jsonb_build_object('id_grouping', sg.id_grouping, 'groupings', jsonb_build_object('name', g.name))) FILTER (WHERE sg.id IS NOT NULL) as station_groupings,
        json_agg(DISTINCT jsonb_build_object('id', p.id, 'id_parameter_type', p.id_parameter_type, 'status', p.status, 'parameter_types', jsonb_build_object('name', pt.name, 'unit', pt.unit))) FILTER (WHERE p.id IS NOT NULL) as parameters
      FROM stations s
      LEFT JOIN station_groupings sg ON sg.id_station = s.id
      LEFT JOIN groupings g ON g.id = sg.id_grouping
      LEFT JOIN parameters p ON p.id_station = s.id
      LEFT JOIN parameter_types pt ON pt.id = p.id_parameter_type
      WHERE s.id = ${station.id}
      GROUP BY s.id
    `;

    return NextResponse.json(result, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const startDate = searchParams.get("start_date");
  const endDate = searchParams.get("end_date") || new Date().toISOString();

  try {
    if (id) {
      const [station] = await sql`
        SELECT s.*,
          json_agg(DISTINCT jsonb_build_object('id_grouping', sg.id_grouping, 'groupings', jsonb_build_object('name', g.name))) FILTER (WHERE sg.id IS NOT NULL) as station_groupings,
          json_agg(DISTINCT jsonb_build_object('id', p.id, 'id_parameter_type', p.id_parameter_type, 'status', p.status, 'parameter_types', jsonb_build_object('name', pt.name, 'unit', pt.unit))) FILTER (WHERE p.id IS NOT NULL) as parameters
        FROM stations s
        LEFT JOIN station_groupings sg ON sg.id_station = s.id
        LEFT JOIN groupings g ON g.id = sg.id_grouping
        LEFT JOIN parameters p ON p.id_station = s.id
        LEFT JOIN parameter_types pt ON pt.id = p.id_parameter_type
        WHERE s.id = ${id}
        GROUP BY s.id
      `;

      if (!station)
        return NextResponse.json(
          { error: "Estação não encontrada." },
          { status: 404 },
        );

      const parametersWithMeasurements = await Promise.all(
        (station.parameters ?? []).map(async (param: { id: number }) => {
          const measurements = await fetchAllMeasurements(
            param.id,
            startDate,
            endDate,
          );
          return { ...param, measurements };
        }),
      );

      return NextResponse.json(
        { ...station, parameters: parametersWithMeasurements },
        { status: 200 },
      );
    }

    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const search = searchParams.get("search") || "";
    const rawLimit = searchParams.get("limit");
    const isAll = rawLimit === "all";
    const limit = isAll
      ? null
      : Math.min(Math.max(Number(rawLimit ?? 10), 1), 50);
    const offset = isAll ? null : (page - 1) * (limit ?? 10);
    const statusParam = searchParams.get("status");
    const groupId = searchParams.get("grouping");

    const searchFilter = search
      ? sql`AND s.name ILIKE ${"%" + search + "%"}`
      : sql``;
    const statusFilter =
      statusParam === "active"
        ? sql`AND s.status = true`
        : statusParam === "inactive"
          ? sql`AND s.status = false`
          : sql``;

    let groupFilter = sql``;
    if (groupId && groupId !== "all") {
      const stationIds = await sql<
        Array<{ id_station: number }>
      >`SELECT id_station FROM station_groupings WHERE id_grouping = ${Number(groupId)}`;
      const ids = stationIds.map((r: { id_station: number }) => r.id_station);
      if (ids.length === 0)
        return NextResponse.json(
          { data: [], pagination: { page, limit, total: 0, totalPages: 1 } },
          { status: 200 },
        );
      groupFilter = sql`AND s.id = ANY(${ids})`;
    }

    const paginationClause = isAll
      ? sql``
      : sql`LIMIT ${limit} OFFSET ${offset}`;

    const data = await sql`
      SELECT s.*,
        json_agg(DISTINCT jsonb_build_object('id_grouping', sg.id_grouping, 'groupings', jsonb_build_object('name', g.name))) FILTER (WHERE sg.id IS NOT NULL) as station_groupings,
        json_agg(DISTINCT jsonb_build_object('id', p.id, 'id_parameter_type', p.id_parameter_type, 'parameter_types', jsonb_build_object('name', pt.name, 'unit', pt.unit, 'symbol', pt.symbol))) FILTER (WHERE p.id IS NOT NULL) as parameters
      FROM stations s
      LEFT JOIN station_groupings sg ON sg.id_station = s.id
      LEFT JOIN groupings g ON g.id = sg.id_grouping
      LEFT JOIN parameters p ON p.id_station = s.id
      LEFT JOIN parameter_types pt ON pt.id = p.id_parameter_type
      WHERE 1=1 ${searchFilter} ${statusFilter} ${groupFilter}
      GROUP BY s.id
      ORDER BY s.name ASC
      ${paginationClause}
    `;

    const [{ count }] = await sql`
      SELECT COUNT(DISTINCT s.id)::int as count FROM stations s
      WHERE 1=1 ${searchFilter} ${statusFilter} ${groupFilter}
    `;

    return NextResponse.json(
      {
        data,
        pagination: {
          page,
          limit: isAll ? "all" : limit,
          total: count,
          totalPages: isAll ? 1 : Math.ceil((count || 0) / (limit || 1)),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Erro no GET stations:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const role = session.user.role;
  if (role === "USER")
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

  try {
    const body = await req.json();
    const {
      id,
      name,
      id_datalogger,
      status,
      address,
      latitude,
      longitude,
      parameters,
      groupings,
    } = body;

    if (!id)
      return NextResponse.json({ error: "id é obrigatório." }, { status: 400 });

    if (role === "OPERATOR") {
      if (!name && status === undefined)
        return NextResponse.json(
          { error: "Informe nome ou status para atualizar." },
          { status: 400 },
        );

      if (name) {
        const existing =
          await sql`SELECT id FROM stations WHERE name = ${name} AND id != ${id} LIMIT 1`;
        if (existing.length > 0)
          return NextResponse.json(
            { error: "Nome já em uso." },
            { status: 409 },
          );
      }

      const [data] = await sql`
        UPDATE stations SET
          ${name ? sql`name = ${name},` : sql``}
          ${status !== undefined ? sql`status = ${status}` : sql`status = status`}
        WHERE id = ${id} RETURNING *
      `;

      if (!data)
        return NextResponse.json(
          { error: "Estação não encontrada." },
          { status: 404 },
        );

      return NextResponse.json(data, { status: 200 });
    }

    if (name) {
      const existing =
        await sql`SELECT id FROM stations WHERE name = ${name} AND id != ${id} LIMIT 1`;
      if (existing.length > 0)
        return NextResponse.json({ error: "Nome já em uso." }, { status: 409 });
    }

    await sql`
      UPDATE stations SET
        name = ${name}, id_datalogger = ${id_datalogger}, status = ${status},
        address = ${address}, latitude = ${latitude}, longitude = ${longitude}
      WHERE id = ${id}
    `;

    if (Array.isArray(parameters) && parameters.length > 0) {
      await sql`DELETE FROM parameters WHERE id_station = ${id}`;
      await sql`
        INSERT INTO parameters (id_station, id_parameter_type, status)
        SELECT ${id}, unnest(${parameters}::int[]), true
      `;
    }

    if (groupings !== undefined) {
      await sql`DELETE FROM station_groupings WHERE id_station = ${id}`;
      if (Array.isArray(groupings) && groupings.length > 0) {
        await sql`
          INSERT INTO station_groupings (id_station, id_grouping)
          SELECT ${id}, unnest(${groupings}::int[])
        `;
      }
    }

    const [result] = await sql`
      SELECT s.*,
        json_agg(DISTINCT jsonb_build_object('id_grouping', sg.id_grouping, 'groupings', jsonb_build_object('name', g.name))) FILTER (WHERE sg.id IS NOT NULL) as station_groupings,
        json_agg(DISTINCT jsonb_build_object('id', p.id, 'id_parameter_type', p.id_parameter_type, 'status', p.status, 'parameter_types', jsonb_build_object('name', pt.name, 'unit', pt.unit))) FILTER (WHERE p.id IS NOT NULL) as parameters
      FROM stations s
      LEFT JOIN station_groupings sg ON sg.id_station = s.id
      LEFT JOIN groupings g ON g.id = sg.id_grouping
      LEFT JOIN parameters p ON p.id_station = s.id
      LEFT JOIN parameter_types pt ON pt.id = p.id_parameter_type
      WHERE s.id = ${id}
      GROUP BY s.id
    `;

    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Erro interno ao atualizar." },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

  try {
    const { id } = await req.json();
    if (!id)
      return NextResponse.json({ error: "id é obrigatório." }, { status: 400 });

    const existing =
      await sql`SELECT id FROM stations WHERE id = ${id} LIMIT 1`;
    if (existing.length === 0)
      return NextResponse.json(
        { error: "Estação não encontrada." },
        { status: 404 },
      );

    await sql`DELETE FROM station_groupings WHERE id_station = ${id}`;
    await sql`DELETE FROM parameters WHERE id_station = ${id}`;
    await sql`DELETE FROM stations WHERE id = ${id}`;

    return NextResponse.json(
      { message: "Estação deletada com sucesso." },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 },
    );
  }
}
