import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import type { ParameterType } from "@/types/parameter";

type StationSummary = {
  id: number;
  name: string;
};

type ParameterStationLink = {
  id_parameter_type: number;
  id_station: number;
};

function mapLinkedStationsByParameterType(
  parameterTypeIds: number[],
  parameterLinks: ParameterStationLink[],
  stations: StationSummary[],
) {
  const stationById = new Map<number, StationSummary>(
    stations.map((station) => [station.id, station]),
  );

  const linkedStationsByType = new Map<number, StationSummary[]>();

  parameterTypeIds.forEach((parameterTypeId) => {
    linkedStationsByType.set(parameterTypeId, []);
  });

  parameterLinks.forEach((link) => {
    const station = stationById.get(link.id_station);
    if (!station) return;

    const current = linkedStationsByType.get(link.id_parameter_type) ?? [];

    if (!current.some((existing) => existing.id === station.id)) {
      linkedStationsByType.set(link.id_parameter_type, [...current, station]);
    }
  });

  return linkedStationsByType;
}

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

    if (idRaw) {
      const id = Number(idRaw);
      if (!Number.isFinite(id)) {
        return NextResponse.json({ error: "id inválido" }, { status: 400 });
      }

      const { data: parameterType, error: parameterTypeError } = await supabaseAdmin
        .from("parameter_types")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (parameterTypeError) throw parameterTypeError;
      if (!parameterType) {
        return NextResponse.json({ error: "Tipo de parâmetro não encontrado" }, { status: 404 });
      }

      const { data: parameterRows, error: parameterRowsError } = await supabaseAdmin
        .from("parameters")
        .select("id_station")
        .eq("id_parameter_type", id)
        .eq("status", true);

      if (parameterRowsError) throw parameterRowsError;

      const stationIds = Array.from(
        new Set((parameterRows ?? []).map((row: { id_station: number }) => row.id_station)),
      ) as number[];

      if (stationIds.length === 0) {
        return NextResponse.json(
          {
            data: parameterType as ParameterType,
            currentStationId: null,
            currentStations: [],
          },
          { status: 200 },
        );
      }

      const { data: stationRows, error: stationRowsError } = await supabaseAdmin
        .from("stations")
        .select("id,name")
        .in("id", stationIds);

      if (stationRowsError) throw stationRowsError;

      const sortedStationIds = [...stationIds].sort((a, b) => a - b);

      return NextResponse.json(
        {
          data: parameterType as ParameterType,
          currentStationIds: sortedStationIds,
          currentStationId: sortedStationIds[0] ?? null,
          currentStations: (stationRows ?? []).map((station: { id: number; name: string }) => ({
            id: station.id,
            name: station.name,
          })),
        },
        { status: 200 },
      );
    }

    const limit = isAll
      ? null
      : Math.min(Math.max(Number(rawLimit ?? 10), 1), 50);

    let parameterTypeIdsByStation: number[] | null = null;

    if (stationIdRaw && stationIdRaw !== "all") {
      const stationId = Number(stationIdRaw);
      if (!Number.isFinite(stationId)) {
        return NextResponse.json({ error: "stationId inválido" }, { status: 400 });
      }

      const { data: parameterRows, error: parameterRowsError } = await supabaseAdmin
        .from("parameters")
        .select("id_parameter_type")
        .eq("id_station", stationId)
        .eq("status", true);

      if (parameterRowsError) throw parameterRowsError;

      parameterTypeIdsByStation = Array.from(
        new Set(
          (parameterRows ?? []).map(
            (row: { id_parameter_type: number }) => row.id_parameter_type,
          ),
        ),
      );

      if (parameterTypeIdsByStation.length === 0) {
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
    }

    let query = supabaseAdmin
      .from("parameter_types")
      .select("*", { count: "exact" })
      .order("id", { ascending: true });

    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    if (parameterTypeIdsByStation) {
      query = query.in("id", parameterTypeIdsByStation);
    }

    if (!isAll && limit !== null) {
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    const parameterTypeRows = (data ?? []) as ParameterType[];

    if (parameterTypeRows.length === 0) {
      return NextResponse.json(
        {
          data: [],
          pagination: {
            page,
            limit: isAll ? "all" : limit,
            total: count,
            totalPages: isAll
              ? 1
              : Math.ceil((count || 0) / (limit || 1)),
          },
        },
        { status: 200 },
      );
    }

    const parameterTypeIds = parameterTypeRows.map((parameterType) => parameterType.id);

    const { data: parameterLinks, error: parameterLinksError } = await supabaseAdmin
      .from("parameters")
      .select("id_parameter_type,id_station")
      .in("id_parameter_type", parameterTypeIds)
      .eq("status", true);

    if (parameterLinksError) throw parameterLinksError;

    const stationIds = Array.from(
      new Set((parameterLinks ?? []).map((link: ParameterStationLink) => link.id_station)),
    ) as number[];

    let stationRows: StationSummary[] = [];

    if (stationIds.length > 0) {
      const { data: fetchedStations, error: fetchedStationsError } = await supabaseAdmin
        .from("stations")
        .select("id,name")
        .in("id", stationIds);

      if (fetchedStationsError) throw fetchedStationsError;
      stationRows = (fetchedStations ?? []) as StationSummary[];
    }

    const linkedStationsByType = mapLinkedStationsByParameterType(
      parameterTypeIds,
      (parameterLinks ?? []) as ParameterStationLink[],
      stationRows,
    );

    const responseData = parameterTypeRows.map((parameterType) => ({
      ...parameterType,
      linked_stations: linkedStationsByType.get(parameterType.id) ?? [],
      is_active: (linkedStationsByType.get(parameterType.id) ?? []).length > 0,
    }));

    return NextResponse.json(
      {
        data: responseData,
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
    const body: Omit<ParameterType, "id"> & { stationIds?: number[]; stationId?: number } = await req.json();
    const { name, unit, symbol, factor_value, offset_value, json_name, stationIds, stationId } = body;


    if (!name || !unit || !symbol) {
      return NextResponse.json({ error: "Nome, unidade e símbolo são obrigatórios." }, { status: 400 });
    }

    const normalizedStationIds = Array.from(
      new Set(
        (Array.isArray(stationIds) ? stationIds : Number.isFinite(stationId) ? [stationId as number] : [])
          .filter((value): value is number => Number.isFinite(value)),
      ),
    );

    if (normalizedStationIds.length === 0) {
      return NextResponse.json({ error: "Selecione ao menos uma estação." }, { status: 400 });
    }

    const normalizedName = name.trim();

    const { data: existingByName, error: existingByNameError } = await supabaseAdmin
      .from("parameter_types")
      .select("id")
      .ilike("name", normalizedName);

    if (existingByNameError) throw existingByNameError;

    const existingIds = (existingByName ?? []).map((row: { id: number }) => row.id);

    if (existingIds.length > 0) {
      const { count: activeWithSameNameCount, error: activeWithSameNameError } = await supabaseAdmin
        .from("parameters")
        .select("id", { count: "exact", head: true })
        .in("id_parameter_type", existingIds)
        .eq("status", true);

      if (activeWithSameNameError) throw activeWithSameNameError;

      if ((activeWithSameNameCount ?? 0) > 0) {
        return NextResponse.json(
          { error: "Já existe um tipo de parâmetro ativo com este nome." },
          { status: 409 },
        );
      }
    }

    const { data: validStations, error: validStationError } = await supabaseAdmin
      .from("stations")
      .select("id")
      .in("id", normalizedStationIds)
      .eq("status", true)
      ;

    if (validStationError) throw validStationError;
    if (!validStations || validStations.length !== normalizedStationIds.length) {
      return NextResponse.json({ error: "Uma ou mais estações são inválidas ou inativas." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("parameter_types")
      .insert({
        name: normalizedName,
        unit: unit.trim(),
        symbol: symbol.trim(),
        factor_value,
        offset_value,
        json_name,
      })
      .select()
      .maybeSingle();

    if (error) {
      console.error("Supabase error ao criar tipo de parâmetro:", error);
      return NextResponse.json(
        { error: "Erro ao criar tipo de parâmetro" },
        { status: 500 },
      );
    }
    if (!data)
      return NextResponse.json(
        { error: "Erro ao criar tipo de parâmetro" },
        { status: 500 },
      );

    const { error: linkError } = await supabaseAdmin
      .from("parameters")
      .insert(
        normalizedStationIds.map((id_station) => ({
          id_station,
          id_parameter_type: data.id,
          status: true,
        })),
      );

    if (linkError) {
      console.error("Supabase error ao vincular parâmetro à estação:", linkError);
      return NextResponse.json({ error: "Parâmetro criado, mas falhou ao vincular estação." }, { status: 500 });
    }

    return NextResponse.json(data as ParameterType, { status: 201 });
  } catch {
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
    const body: Partial<Omit<ParameterType, "id">> & { id: number; stationIds?: number[]; stationId?: number | null } = await req.json();
    const { id, name, unit, symbol, factor_value, offset_value, json_name, stationIds, stationId } = body;

    if (!id)
      return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });

    const normalizedStationIds =
      stationIds !== undefined
        ? Array.from(
            new Set(
              stationIds.filter((value): value is number => Number.isFinite(value)),
            ),
          )
        : stationId !== undefined
          ? (stationId === null ? [] : [stationId].filter((value): value is number => Number.isFinite(value)))
          : undefined;

    if (normalizedStationIds !== undefined && normalizedStationIds.length > 0) {
      const { data: validStations, error: validStationError } = await supabaseAdmin
        .from("stations")
        .select("id")
        .in("id", normalizedStationIds)
        .eq("status", true)
        ;

      if (validStationError) throw validStationError;

      if (!validStations || validStations.length !== normalizedStationIds.length) {
        return NextResponse.json({ error: "Uma ou mais estações são inválidas ou inativas." }, { status: 400 });
      }
    }

    const sanitizedName = typeof name === "string" ? name.trim() : undefined;
    const sanitizedUnit = typeof unit === "string" ? unit.trim() : undefined;
    const sanitizedSymbol = typeof symbol === "string" ? symbol.trim() : undefined;

    const { data, error } = await supabaseAdmin
      .from("parameter_types")
      .update({
        name: sanitizedName,
        unit: sanitizedUnit,
        symbol: sanitizedSymbol,
        factor_value,
        offset_value,
        json_name,
      })
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      console.error("Supabase error ao atualizar tipo de parâmetro:", error);
      return NextResponse.json(
        { error: "Erro ao atualizar tipo de parâmetro" },
        { status: 500 },
      );
    }
    if (!data)
      return NextResponse.json(
        { error: "Tipo de parâmetro não encontrado" },
        { status: 404 },
      );

    if (normalizedStationIds !== undefined) {
      const { data: existingLinks, error: existingLinksError } = await supabaseAdmin
        .from("parameters")
        .select("id,id_station,status")
        .eq("id_parameter_type", id);

      if (existingLinksError) throw existingLinksError;

      const currentLinks = (existingLinks ?? []) as Array<{ id: number; id_station: number; status: boolean }>;
      const desiredStationIdSet = new Set(normalizedStationIds);
      const currentStationIdSet = new Set(currentLinks.map((row) => row.id_station));

      const rowsToInsert = normalizedStationIds
        .filter((id_station) => !currentStationIdSet.has(id_station))
        .map((id_station) => ({
          id_station,
          id_parameter_type: id,
          status: true,
        }));

      if (rowsToInsert.length > 0) {
        const { error: insertLinksError } = await supabaseAdmin
          .from("parameters")
          .insert(rowsToInsert);

        if (insertLinksError) throw insertLinksError;
      }

      const idsToEnable = currentLinks
        .filter((row) => desiredStationIdSet.has(row.id_station) && !row.status)
        .map((row) => row.id);

      if (idsToEnable.length > 0) {
        const { error: enableLinksError } = await supabaseAdmin
          .from("parameters")
          .update({ status: true })
          .in("id", idsToEnable);

        if (enableLinksError) throw enableLinksError;
      }

      const idsToDisable = currentLinks
        .filter((row) => !desiredStationIdSet.has(row.id_station) && row.status)
        .map((row) => row.id);

      if (idsToDisable.length > 0) {
        const { error: disableLinksError } = await supabaseAdmin
          .from("parameters")
          .update({ status: false })
          .in("id", idsToDisable);

        if (disableLinksError) throw disableLinksError;
      }
    }

    return NextResponse.json(data as ParameterType, { status: 200 });
  } catch (error) {
    console.error("Erro no PUT parameter_types:", error);
    return NextResponse.json({ error: "Erro interno ao atualizar." }, { status: 500 });
  }
}
