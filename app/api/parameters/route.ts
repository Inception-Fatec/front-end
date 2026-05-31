import { auth } from "@/auth";
import sql from "@/lib/db-postgres";
import { NextRequest, NextResponse } from "next/server";
import type { ParameterType } from "@/types/parameter";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const url = new URL(req.url);
    const idRaw = url.searchParams.get("id");
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const search = (url.searchParams.get("search") ?? "").trim();
    const stationIdRaw = url.searchParams.get("stationId");
    const rawLimit = url.searchParams.get("limit");
    const isAll = rawLimit === "all";
    const limit = isAll
      ? null
      : Math.min(Math.max(Number(rawLimit ?? 10), 1), 50);

    if (idRaw) {
      const id = Number(idRaw);
      if (!Number.isFinite(id)) {
        return NextResponse.json({ error: "id inválido" }, { status: 400 });
      }

      const [parameterType] =
        await sql`SELECT * FROM parameter_types WHERE id = ${id}`;
      if (!parameterType)
        return NextResponse.json(
          { error: "Tipo de parâmetro não encontrado" },
          { status: 404 },
        );

      const rows = await sql<{ id_station: number }[]>`
        SELECT DISTINCT id_station FROM parameters 
        WHERE id_parameter_type = ${id} AND status = true
      `;

      const stationIds = rows.map((r) => r.id_station);

      if (stationIds.length === 0)
        return NextResponse.json(
          {
            data: parameterType as ParameterType,
            currentStationId: null,
            currentStations: [],
          },
          { status: 200 },
        );

      const stations =
        await sql`SELECT id, name FROM stations WHERE id = ANY(${stationIds})`;
      const sorted = [...stationIds].sort((a, b) => a - b);

      return NextResponse.json(
        {
          data: parameterType as ParameterType,
          currentStationIds: sorted,
          currentStationId: sorted[0] ?? null,
          currentStations: stations,
        },
        { status: 200 },
      );
    }

    let paramTypeIdsByStation: number[] | null = null;

    if (stationIdRaw && stationIdRaw !== "all") {
      const stationId = Number(stationIdRaw);
      if (!Number.isFinite(stationId)) {
        return NextResponse.json(
          { error: "stationId inválido" },
          { status: 400 },
        );
      }

      const rows = await sql<{ id_parameter_type: number }[]>`
        SELECT DISTINCT id_parameter_type FROM parameters
        WHERE id_station = ${stationId} AND status = true
      `;
      paramTypeIdsByStation = rows.map((r) => r.id_parameter_type);

      if (paramTypeIdsByStation.length === 0)
        return NextResponse.json(
          {
            data: [],
            pagination: {
              page,
              limit: isAll ? "all" : limit,
              total: 0,
              totalPages: 1,
            },
          },
          { status: 200 },
        );
    }

    const searchPattern = search ? `%${search}%` : null;

    const data = await sql`
      SELECT pt.* FROM parameter_types pt
      WHERE 1=1
        ${searchPattern ? sql`AND pt.name ILIKE ${searchPattern}` : sql``}
        ${paramTypeIdsByStation ? sql`AND pt.id = ANY(${paramTypeIdsByStation})` : sql``}
      ORDER BY pt.id ASC
      ${isAll ? sql`` : sql`LIMIT ${limit} OFFSET ${(page - 1) * (limit ?? 10)}`}
    `;

    const countResult = await sql<{ count: string }[]>`
      SELECT COUNT(*) as count FROM parameter_types pt
      WHERE 1=1
        ${searchPattern ? sql`AND pt.name ILIKE ${searchPattern}` : sql``}
        ${paramTypeIdsByStation ? sql`AND pt.id = ANY(${paramTypeIdsByStation})` : sql``}
    `;

    const count = Number(countResult[0]?.count ?? 0);
    const paramTypeIds = data.map((pt) => pt.id);

    if (paramTypeIds.length === 0)
      return NextResponse.json(
        {
          data: [],
          pagination: {
            page,
            limit: isAll ? "all" : limit,
            total: count,
            totalPages: isAll ? 1 : Math.ceil(count / (limit || 1)),
          },
        },
        { status: 200 },
      );

    const paramLinks = await sql<
      { id_parameter_type: number; id_station: number }[]
    >`
      SELECT id_parameter_type, id_station FROM parameters 
      WHERE id_parameter_type = ANY(${paramTypeIds}) AND status = true
    `;

    const stationIds = [...new Set(paramLinks.map((l) => l.id_station))];

    const stationRows =
      stationIds.length > 0
        ? await sql<
            { id: number; name: string }[]
          >`SELECT id, name FROM stations WHERE id = ANY(${stationIds})`
        : [];

    const stationById = new Map(stationRows.map((s) => [s.id, s]));
    const linkedByType = new Map<number, { id: number; name: string }[]>();

    paramTypeIds.forEach((id: number) => linkedByType.set(id, []));

    for (const link of paramLinks) {
      const station = stationById.get(link.id_station);
      if (!station) continue;
      const current = linkedByType.get(link.id_parameter_type) ?? [];
      if (!current.some((s) => s.id === station.id)) {
        linkedByType.set(link.id_parameter_type, [...current, station]);
      }
    }

    const responseData = data.map((pt) => ({
      ...pt,
      linked_stations: linkedByType.get(pt.id) ?? [],
      is_active: (linkedByType.get(pt.id) ?? []).length > 0,
    }));

    return NextResponse.json(
      {
        data: responseData,
        pagination: {
          page,
          limit: isAll ? "all" : limit,
          total: count,
          totalPages: isAll ? 1 : Math.ceil(count / (limit || 1)),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Erro no GET parameter_types:", error);
    return NextResponse.json(
      { error: "Erro ao buscar tipos de parâmetro" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  try {
    const body = await req.json();
    const {
      name,
      unit,
      symbol,
      factor_value,
      offset_value,
      json_name,
      stationIds,
      stationId,
    } = body;

    if (!name || !unit || !symbol)
      return NextResponse.json(
        { error: "Nome, unidade e símbolo são obrigatórios." },
        { status: 400 },
      );

    const normalizedIds = [
      ...new Set(
        [
          ...(Array.isArray(stationIds) ? stationIds : []),
          ...(Number.isFinite(stationId) ? [stationId] : []),
        ].filter(Number.isFinite),
      ),
    ] as number[];

    if (normalizedIds.length === 0)
      return NextResponse.json(
        { error: "Selecione ao menos uma estação." },
        { status: 400 },
      );

    const normalizedName = name.trim();

    const existing = await sql<{ id: number }[]>`
      SELECT p.id FROM parameters p
      JOIN parameter_types pt ON p.id_parameter_type = pt.id
      WHERE pt.name ILIKE ${normalizedName} AND p.status = true
      LIMIT 1
    `;

    if (existing.length > 0)
      return NextResponse.json(
        { error: "Já existe um tipo de parâmetro ativo com este nome." },
        { status: 409 },
      );

    const validStations =
      await sql`SELECT id FROM stations WHERE id = ANY(${normalizedIds})`;
    if (validStations.length !== normalizedIds.length)
      return NextResponse.json(
        { error: "Uma ou mais estações são inválidas." },
        { status: 400 },
      );

    const [data] = await sql`
      INSERT INTO parameter_types (name, unit, symbol, factor_value, offset_value, json_name)
      VALUES (${normalizedName}, ${unit.trim()}, ${symbol.trim()}, ${factor_value}, ${offset_value}, ${json_name})
      RETURNING *
    `;

    await sql`
      INSERT INTO parameters (id_station, id_parameter_type, status)
      SELECT unnest(${normalizedIds}::int[]), ${data.id}, true
    `;

    return NextResponse.json(data as ParameterType, { status: 201 });
  } catch (error) {
    console.error("Erro no POST parameter_types:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  try {
    const body = await req.json();
    const {
      id,
      name,
      unit,
      symbol,
      factor_value,
      offset_value,
      json_name,
      stationIds,
      stationId,
    } = body;

    if (!id)
      return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });

    const [data] = await sql`
      UPDATE parameter_types SET
        name = COALESCE(${typeof name === "string" ? name.trim() : null}, name),
        unit = COALESCE(${typeof unit === "string" ? unit.trim() : null}, unit),
        symbol = COALESCE(${typeof symbol === "string" ? symbol.trim() : null}, symbol),
        factor_value = COALESCE(${factor_value ?? null}, factor_value),
        offset_value = COALESCE(${offset_value ?? null}, offset_value),
        json_name = COALESCE(${json_name ?? null}, json_name)
      WHERE id = ${id}
      RETURNING *
    `;

    if (!data)
      return NextResponse.json(
        { error: "Tipo de parâmetro não encontrado" },
        { status: 404 },
      );

    const normalizedIds =
      stationIds !== undefined
        ? [...new Set(stationIds.filter(Number.isFinite))]
        : stationId !== undefined
          ? stationId === null
            ? []
            : [stationId].filter(Number.isFinite)
          : undefined;

    if (normalizedIds !== undefined) {
      if (normalizedIds.length > 0) {
        const valid =
          await sql`SELECT id FROM stations WHERE id = ANY(${normalizedIds})`;
        if (valid.length !== normalizedIds.length)
          return NextResponse.json(
            { error: "Uma ou mais estações são inválidas." },
            { status: 400 },
          );
      }

      const existing = await sql<
        { id: number; id_station: number; status: boolean }[]
      >`
        SELECT id, id_station, status FROM parameters WHERE id_parameter_type = ${id}
      `;
      const desiredSet = new Set(normalizedIds);
      const currentSet = new Set(existing.map((r) => r.id_station));

      const toInsert = normalizedIds.filter(
        (sid: number) => !currentSet.has(sid),
      );
      if (toInsert.length > 0) {
        await sql`
          INSERT INTO parameters (id_station, id_parameter_type, status) 
          SELECT unnest(${toInsert}::int[]), ${id}, true
        `;
      }

      const toEnable = existing
        .filter((r) => desiredSet.has(r.id_station) && !r.status)
        .map((r) => r.id);
      if (toEnable.length > 0)
        await sql`UPDATE parameters SET status = true WHERE id = ANY(${toEnable})`;

      const toDisable = existing
        .filter((r) => !desiredSet.has(r.id_station) && r.status)
        .map((r) => r.id);
      if (toDisable.length > 0)
        await sql`UPDATE parameters SET status = false WHERE id = ANY(${toDisable})`;
    }

    return NextResponse.json(data as ParameterType, { status: 200 });
  } catch (error) {
    console.error("Erro no PUT parameter_types:", error);
    return NextResponse.json(
      { error: "Erro interno ao atualizar." },
      { status: 500 },
    );
  }
}
