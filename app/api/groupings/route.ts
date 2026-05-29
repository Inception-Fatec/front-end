import { auth } from "@/auth";
import sql from "@/lib/db-postgres";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.user.role === "USER")
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

  try {
    const body = await req.json();
    const { name, stations } = body;

    if (!name)
      return NextResponse.json({ error: "name é obrigatório." }, { status: 400 });

    const existing = await sql`SELECT id FROM groupings WHERE name = ${name} LIMIT 1`;
    if (existing.length > 0)
      return NextResponse.json({ error: "Nome já em uso." }, { status: 409 });

    if (Array.isArray(stations) && stations.length > 0) {
      const valid = await sql`SELECT id FROM stations WHERE id = ANY(${stations})`;
      if (valid.length !== stations.length)
        return NextResponse.json({ error: "Uma ou mais estações informadas não existem." }, { status: 400 });
    }

    const [group] = await sql`INSERT INTO groupings (name) VALUES (${name}) RETURNING id`;

    if (Array.isArray(stations) && stations.length > 0) {
      await sql`
        INSERT INTO station_groupings (id_station, id_grouping)
        SELECT unnest(${stations}::int[]), ${group.id}
      `;
    }

    const [result] = await sql`
      SELECT g.*, json_agg(json_build_object('id_station', sg.id_station)) as station_groupings
      FROM groupings g
      LEFT JOIN station_groupings sg ON sg.id_grouping = g.id
      WHERE g.id = ${group.id}
      GROUP BY g.id
    `;

    return NextResponse.json(result, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  try {
    if (id) {
      const [group] = await sql`
        SELECT
          g.id, g.name,
          json_agg(
            json_build_object(
              'stations', json_build_object('id', s.id, 'name', s.name, 'status', s.status)
            )
          ) FILTER (WHERE s.id IS NOT NULL) as station_groupings
        FROM groupings g
        LEFT JOIN station_groupings sg ON sg.id_grouping = g.id
        LEFT JOIN stations s ON s.id = sg.id_station
        WHERE g.id = ${id}
        GROUP BY g.id
      `;

      if (!group)
        return NextResponse.json({ error: "Grupo não encontrado." }, { status: 404 });

      return NextResponse.json(group, { status: 200 });
    }

    const groups = await sql`
      SELECT
        g.id, g.name,
        json_agg(
          json_build_object(
            'stations', json_build_object('id', s.id, 'name', s.name)
          )
        ) FILTER (WHERE s.id IS NOT NULL) as station_groupings
      FROM groupings g
      LEFT JOIN station_groupings sg ON sg.id_grouping = g.id
      LEFT JOIN stations s ON s.id = sg.id_station
      GROUP BY g.id
      ORDER BY g.id
    `;

    return NextResponse.json(groups, { status: 200 });
  } catch (error) {
    console.error("Erro no GET groupings:", error);
    return NextResponse.json({ error: "Erro interno ao buscar grupos." }, { status: 500 });
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
    const { id, name, stations } = body;

    if (!id)
      return NextResponse.json({ error: "id é obrigatório." }, { status: 400 });

    if (name) {
      const existing = await sql`SELECT id FROM groupings WHERE name = ${name} AND id != ${id} LIMIT 1`;
      if (existing.length > 0)
        return NextResponse.json({ error: "Nome já em uso." }, { status: 409 });

      await sql`UPDATE groupings SET name = ${name} WHERE id = ${id}`;
    }

    if (stations !== undefined) {
      if (Array.isArray(stations) && stations.length > 0) {
        const valid = await sql`SELECT id FROM stations WHERE id = ANY(${stations})`;
        if (valid.length !== stations.length)
          return NextResponse.json({ error: "Uma ou mais estações informadas não existem." }, { status: 400 });
      }

      await sql`DELETE FROM station_groupings WHERE id_grouping = ${id}`;

      if (Array.isArray(stations) && stations.length > 0) {
        await sql`
          INSERT INTO station_groupings (id_station, id_grouping)
          SELECT unnest(${stations}::int[]), ${id}
        `;
      }
    }

    const [updated] = await sql`
      SELECT
        g.id, g.name,
        json_agg(
          json_build_object(
            'stations', json_build_object('id', s.id, 'name', s.name)
          )
        ) FILTER (WHERE s.id IS NOT NULL) as station_groupings
      FROM groupings g
      LEFT JOIN station_groupings sg ON sg.id_grouping = g.id
      LEFT JOIN stations s ON s.id = sg.id_station
      WHERE g.id = ${id}
      GROUP BY g.id
    `;

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("Erro no PUT groupings:", error);
    return NextResponse.json({ error: "Erro interno ao atualizar." }, { status: 500 });
  }
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
      return NextResponse.json({ error: "id é obrigatório." }, { status: 400 });

    const existing = await sql`SELECT id FROM groupings WHERE id = ${id} LIMIT 1`;
    if (existing.length === 0)
      return NextResponse.json({ error: "Grupo não encontrado." }, { status: 404 });

    await sql`DELETE FROM station_groupings WHERE id_grouping = ${id}`;
    await sql`DELETE FROM groupings WHERE id = ${id}`;

    return NextResponse.json({ message: "Grupo excluído com sucesso." }, { status: 200 });
  } catch (error) {
    console.error("Erro no DELETE groupings:", error);
    return NextResponse.json({ error: "Erro interno ao excluir grupo." }, { status: 500 });
  }
}