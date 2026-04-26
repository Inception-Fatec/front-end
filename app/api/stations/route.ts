import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import type {
  Station,
  CreateStation,
  UpdateStation,
  StationWithGroupings,
  StationWithDetails,
  PaginatedStations,
} from "@/types/station";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

  try {
    const body: CreateStation & {
      parameters?: number[];
      groupings?: number[];
    } = await req.json();
    const {
      name,
      id_datalogger,
      address,
      latitude,
      longitude,
      parameters,
      groupings,
    } = body;

    if (!name || !id_datalogger) {
      return NextResponse.json(
        { error: "todos os campos são obrigatórios" },
        { status: 400 },
      );
    }

    const { data: existing } = await supabaseAdmin
      .from("stations")
      .select("id")
      .eq("name", name)
      .maybeSingle();

    if (existing)
      return NextResponse.json({ error: "Nome já em uso." }, { status: 409 });

    const { data: existingDatalogger } = await supabaseAdmin
      .from("stations")
      .select("id")
      .eq("id_datalogger", id_datalogger)
      .maybeSingle();

    if (existingDatalogger)
      return NextResponse.json(
        { error: "Datalogger já está em uso por outra estação." },
        { status: 409 },
      );

    if (Array.isArray(groupings) && groupings.length > 0) {
      const { data: validGroups, error: checkError } = await supabaseAdmin
        .from("groupings")
        .select("id")
        .in("id", groupings);

      if (checkError) throw checkError;

      if (!validGroups || validGroups.length !== groupings.length) {
        return NextResponse.json(
          { error: "Um ou mais grupos informados não existem no sistema." },
          { status: 400 },
        );
      }
    }

    const { data: station, error } = await supabaseAdmin
      .from("stations")
      .insert({
        name,
        id_datalogger,
        address: address ?? null,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        status: true,
      })
      .select("id")
      .maybeSingle();

    if (error || !station) {
      console.error("Supabase error ao criar estação:", error);
      return NextResponse.json(
        { error: "Erro ao criar estação." },
        { status: 500 },
      );
    }

    if (Array.isArray(parameters) && parameters.length > 0) {
      const parameterRows = parameters.map((id_parameter_type: number) => ({
        id_station: station.id,
        id_parameter_type,
        status: true,
      }));

      const { error: paramError } = await supabaseAdmin
        .from("parameters")
        .insert(parameterRows);

      if (paramError) {
        console.error("Supabase error ao vincular parâmetros:", paramError);
        return NextResponse.json(
          { error: "Estação criada mas erro ao vincular parâmetros." },
          { status: 500 },
        );
      }
    }

    if (Array.isArray(groupings) && groupings.length > 0) {
      const stationGroupings = groupings.map((id_grouping: number) => ({
        id_station: station.id,
        id_grouping,
      }));

      const { error: groupingError } = await supabaseAdmin
        .from("station_groupings")
        .insert(stationGroupings);

      if (groupingError) {
        console.error("Supabase error ao inserir grupos:", groupingError);
        return NextResponse.json(
          { error: "Erro ao associar grupos à estação." },
          { status: 500 },
        );
      }
    }

    const { data: stationWithGroupings, error: fetchError } =
      await supabaseAdmin
        .from("stations")
        .select(
          `*, station_groupings ( id_grouping, groupings ( name ) ), parameters ( id, id_parameter_type, status, parameter_types ( name, unit ) )`,
        )
        .eq("id", station.id)
        .maybeSingle();

    if (fetchError || !stationWithGroupings) {
      return NextResponse.json(
        { error: "Erro ao buscar estação criada." },
        { status: 500 },
      );
    }

    return NextResponse.json(stationWithGroupings, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 },
    );
  }
}

async function fetchAllMeasurements(
  parameterId: number,
  startDate: string | null,
  endDate: string,
): Promise<{ id: number; value: number; date_time: string }[]> {
  const PAGE = 1000;
  let from = 0;
  let all: { id: number; value: number; date_time: string }[] = [];

  while (true) {
    let query = supabaseAdmin
      .from("measurements")
      .select("id, value, date_time")
      .eq("id_parameter", parameterId)
      .lte("date_time", endDate)
      .order("date_time", { ascending: true })
      .range(from, from + PAGE - 1);

    if (startDate) {
      query = query.gte("date_time", startDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) break;

    all = all.concat(data);
    if (data.length < PAGE) break;

    from += PAGE;
  }

  return all;
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
      // Busca estação com parâmetros mas SEM measurements no join
      const { data: station, error } = await supabaseAdmin
        .from("stations")
        .select(
          `
          *,
          station_groupings ( id_grouping, groupings ( name ) ),
          parameters (
            id,
            id_parameter_type,
            status,
            parameter_types ( name, unit )
          )
        `,
        )
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      if (!station)
        return NextResponse.json(
          { error: "Estação não encontrada." },
          { status: 404 },
        );

      // Busca todas as measurements de cada parâmetro em paralelo paginando internamente
      const parametersWithMeasurements = await Promise.all(
        station.parameters.map(async (param: { id: number }) => {
          const measurements = await fetchAllMeasurements(
            param.id,
            startDate,
            endDate,
          );
          return { ...param, measurements };
        }),
      );

      return NextResponse.json(
        {
          ...station,
          parameters: parametersWithMeasurements,
        } as StationWithDetails,
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

    let queryList = supabaseAdmin
      .from("stations")
      .select(
        `*,
        station_groupings ( id_grouping, groupings ( name ) ),
        parameters ( id, id_parameter_type, parameter_types ( name, unit, symbol ) )`,
        { count: "exact" },
      )
      .order("name", { ascending: true });

    if (search) {
      queryList = queryList.ilike("name", `%${search}%`);
    }

    if (!isAll && limit !== null) {
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      queryList = queryList.range(from, to);
    }

    const { data, error, count } = await queryList;
    if (error) throw error;

    return NextResponse.json(
      {
        data,
        pagination: {
          page,
          limit: isAll ? "all" : limit,
          total: count,
          totalPages: isAll ? 1 : Math.ceil((count || 0) / (limit || 1)),
        },
      } as PaginatedStations,
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
    const body: UpdateStation & {
      action?: "rename" | "disable";
      parameters?: number[];
      groupings?: number[];
    } = await req.json();
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
      if (!name && status === undefined) {
        return NextResponse.json(
          { error: "Informe nome ou status para atualizar." },
          { status: 400 },
        );
      }

      if (name) {
        const { data: existing } = await supabaseAdmin
          .from("stations")
          .select("id")
          .eq("name", name)
          .neq("id", id)
          .maybeSingle();

        if (existing)
          return NextResponse.json(
            { error: "Nome já em uso." },
            { status: 409 },
          );
      }

      const { data, error } = await supabaseAdmin
        .from("stations")
        .update({
          ...(name && { name }),
          ...(status !== undefined && { status }),
        })
        .eq("id", id)
        .select()
        .maybeSingle();

      if (error) {
        console.error("Supabase error ao atualizar estação:", error);
        return NextResponse.json(
          { error: "Erro ao atualizar estação." },
          { status: 500 },
        );
      }
      if (!data)
        return NextResponse.json(
          { error: "Estação não encontrada." },
          { status: 404 },
        );

      return NextResponse.json(data as Station, { status: 200 });
    }

    if (name) {
      const { data: existing } = await supabaseAdmin
        .from("stations")
        .select("id")
        .eq("name", name)
        .neq("id", id)
        .maybeSingle();

      if (existing)
        return NextResponse.json({ error: "Nome já em uso." }, { status: 409 });
    }

    const { data, error } = await supabaseAdmin
      .from("stations")
      .update({ name, id_datalogger, status, address, latitude, longitude })
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      console.error("Supabase error ao atualizar estação:", error);
      return NextResponse.json(
        { error: "Erro ao atualizar estação." },
        { status: 500 },
      );
    }
    if (!data)
      return NextResponse.json(
        { error: "Estação não encontrada." },
        { status: 404 },
      );

    if (Array.isArray(parameters) && parameters.length > 0) {
      const { error: deleteError } = await supabaseAdmin
        .from("parameters")
        .delete()
        .eq("id_station", id);

      if (deleteError) {
        console.error(
          "Supabase error ao remover parâmetros antigos:",
          deleteError,
        );
        return NextResponse.json(
          { error: "Erro ao atualizar parâmetros." },
          { status: 500 },
        );
      }

      const parameterRows = parameters.map((id_parameter_type: number) => ({
        id_station: id,
        id_parameter_type,
        status: true,
      }));

      const { error: insertError } = await supabaseAdmin
        .from("parameters")
        .insert(parameterRows);

      if (insertError) {
        console.error("Supabase error ao inserir parâmetros:", insertError);
        return NextResponse.json(
          { error: "Erro ao atualizar parâmetros." },
          { status: 500 },
        );
      }
    }

    if (groupings !== undefined) {
      const { error: deleteError } = await supabaseAdmin
        .from("station_groupings")
        .delete()
        .eq("id_station", id);

      if (deleteError) {
        return NextResponse.json(
          { error: "Erro ao atualizar grupos." },
          { status: 500 },
        );
      }

      if (Array.isArray(groupings) && groupings.length > 0) {
        const stationGroupings = groupings.map((id_grouping: number) => ({
          id_station: id,
          id_grouping,
        }));

        const { error: insertError } = await supabaseAdmin
          .from("station_groupings")
          .insert(stationGroupings);

        if (insertError) {
          return NextResponse.json(
            { error: "Erro ao inserir grupos." },
            { status: 500 },
          );
        }
      }
    }

    const { data: stationWithGroupings, error: fetchError } =
      await supabaseAdmin
        .from("stations")
        .select(
          `*, station_groupings ( id_grouping, groupings ( name ) ), parameters ( id, id_parameter_type, status, parameter_types ( name, unit ) )`,
        )
        .eq("id", id)
        .maybeSingle();

    if (fetchError || !stationWithGroupings) {
      return NextResponse.json(
        { error: "Erro ao buscar estação atualizada." },
        { status: 500 },
      );
    }

    return NextResponse.json(stationWithGroupings as StationWithGroupings, {
      status: 200,
    });
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
    const { id }: { id: number } = await req.json();
    if (!id)
      return NextResponse.json({ error: "id é obrigatório." }, { status: 400 });

    const { data: existing } = await supabaseAdmin
      .from("stations")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (!existing)
      return NextResponse.json(
        { error: "Estação não encontrada." },
        { status: 404 },
      );

    await supabaseAdmin.from("station_groupings").delete().eq("id_station", id);

    await supabaseAdmin.from("parameters").delete().eq("id_station", id);

    const { error } = await supabaseAdmin
      .from("stations")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Erro ao deletar estação:", error);
      return NextResponse.json(
        { error: "Erro ao deletar estação." },
        { status: 500 },
      );
    }

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
