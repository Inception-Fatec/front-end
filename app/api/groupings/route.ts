import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import type {
  Grouping,
  GroupingWithStations,
  GroupingWithStationDetails,
} from "@/types/grouping";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.user.role === "USER")
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

  try {
    const body: Pick<Grouping, "name"> & { stations?: number[] } =
      await req.json();
    const { name, stations } = body;

    if (!name)
      return NextResponse.json(
        { error: "name é obrigatório." },
        { status: 400 },
      );

    const { data: existing } = await supabaseAdmin
      .from("groupings")
      .select("id")
      .eq("name", name)
      .maybeSingle();

    if (existing)
      return NextResponse.json({ error: "Nome já em uso." }, { status: 409 });

    if (Array.isArray(stations) && stations.length > 0) {
      const { data: validStations, error: checkError } = await supabaseAdmin
        .from("stations")
        .select("id")
        .in("id", stations);

      if (checkError) throw checkError;

      if (!validStations || validStations.length !== stations.length) {
        return NextResponse.json(
          { error: "Uma ou mais estações informadas não existem." },
          { status: 400 },
        );
      }
    }

    const { data: group, error: groupError } = await supabaseAdmin
      .from("groupings")
      .insert({ name })
      .select("id")
      .maybeSingle();

    if (groupError || !group) {
      console.error("Supabase error ao criar grupo:", groupError);
      return NextResponse.json(
        { error: "Erro ao criar grupo." },
        { status: 500 },
      );
    }

    if (Array.isArray(stations) && stations.length > 0) {
      const stationGroupings = stations.map((id_station: number) => ({
        id_station,
        id_grouping: group.id,
      }));

      const { error: relationError } = await supabaseAdmin
        .from("station_groupings")
        .insert(stationGroupings);

      if (relationError) {
        console.error("Supabase error ao vincular estações:", relationError);
        return NextResponse.json(
          { error: "Erro ao vincular estações ao grupo." },
          { status: 500 },
        );
      }
    }

    const { data: groupWithStations, error: fetchError } = await supabaseAdmin
      .from("groupings")
      .select(`*, station_groupings ( id_station )`)
      .eq("id", group.id)
      .maybeSingle();

    if (fetchError || !groupWithStations) {
      return NextResponse.json(
        { error: "Erro ao buscar grupo criado." },
        { status: 500 },
      );
    }

    return NextResponse.json(groupWithStations as GroupingWithStations, {
      status: 201,
    });
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

  try {
    if (id) {
      const { data: group, error } = await supabaseAdmin
        .from("groupings")
        .select(
          `
          id,
          name,
          station_groupings (
            stations (
              id,
              name,
              status
            )
          )
        `,
        )
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      if (!group)
        return NextResponse.json(
          { error: "Grupo não encontrado." },
          { status: 404 },
        );

      return NextResponse.json(group, { status: 200 });
    }

    const { data: allGroups, error } = await supabaseAdmin
      .from("groupings")
      .select(
        `
        id,
        name,
        station_groupings (
          stations (
            id,
            name
          )
        )
      `,
      )
      .order("id");

    if (error) throw error;

    return NextResponse.json(allGroups as GroupingWithStationDetails[], {
      status: 200,
    });
  } catch (error) {
    console.error("Erro no GET groupings:", error);
    return NextResponse.json(
      { error: "Erro interno ao buscar grupos." },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.user.role === "USER")
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

  try {
    const body: Partial<Grouping> & { id: number; stations?: number[] } =
      await req.json();
    const { id, name, stations } = body;

    if (!id)
      return NextResponse.json({ error: "id é obrigatório." }, { status: 400 });

    if (name) {
      const { data: existing } = await supabaseAdmin
        .from("groupings")
        .select("id")
        .eq("name", name)
        .neq("id", id)
        .maybeSingle();

      if (existing)
        return NextResponse.json({ error: "Nome já em uso." }, { status: 409 });

      const { error: updateError } = await supabaseAdmin
        .from("groupings")
        .update({ name })
        .eq("id", id);

      if (updateError) {
        console.error("Supabase error ao atualizar nome:", updateError);
        return NextResponse.json(
          { error: "Erro ao atualizar nome do grupo." },
          { status: 500 },
        );
      }
    }

    if (stations !== undefined) {
      if (Array.isArray(stations) && stations.length > 0) {
        const { data: validStations, error: checkError } = await supabaseAdmin
          .from("stations")
          .select("id")
          .in("id", stations);

        if (checkError) throw checkError;

        if (!validStations || validStations.length !== stations.length) {
          return NextResponse.json(
            { error: "Uma ou mais estações informadas não existem." },
            { status: 400 },
          );
        }
      }

      const { error: deleteError } = await supabaseAdmin
        .from("station_groupings")
        .delete()
        .eq("id_grouping", id);

      if (deleteError) throw deleteError;

      if (Array.isArray(stations) && stations.length > 0) {
        const stationGroupings = stations.map((id_station: number) => ({
          id_station,
          id_grouping: id,
        }));

        const { error: insertError } = await supabaseAdmin
          .from("station_groupings")
          .insert(stationGroupings);

        if (insertError) throw insertError;
      }
    }

    const { data: updatedGroup, error: fetchError } = await supabaseAdmin
      .from("groupings")
      .select(
        `
        id,
        name,
        station_groupings (
          stations (
            id,
            name
          )
        )
      `,
      )
      .eq("id", id)
      .maybeSingle();

    if (fetchError || !updatedGroup) {
      return NextResponse.json(
        { error: "Erro ao buscar grupo atualizado." },
        { status: 500 },
      );
    }

    return NextResponse.json(updatedGroup, { status: 200 });
  } catch (error) {
    console.error("Erro no PUT groupings:", error);
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
  if (session.user.role === "USER")
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

  try {
    const { id }: { id: number } = await req.json();

    if (!id)
      return NextResponse.json({ error: "id é obrigatório." }, { status: 400 });

    const { data: existing, error: checkError } = await supabaseAdmin
      .from("groupings")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (checkError) throw checkError;
    if (!existing)
      return NextResponse.json(
        { error: "Grupo não encontrado." },
        { status: 404 },
      );

    const { error: deleteLinksError } = await supabaseAdmin
      .from("station_groupings")
      .delete()
      .eq("id_grouping", id);

    if (deleteLinksError) {
      console.error("Erro ao deletar vínculos do grupo:", deleteLinksError);
      return NextResponse.json(
        { error: "Erro ao desvincular estações do grupo." },
        { status: 500 },
      );
    }

    const { error: deleteGroupError } = await supabaseAdmin
      .from("groupings")
      .delete()
      .eq("id", id);

    if (deleteGroupError) throw deleteGroupError;

    return NextResponse.json(
      { message: "Grupo excluído com sucesso." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Erro no DELETE groupings:", error);
    return NextResponse.json(
      { error: "Erro interno ao excluir grupo." },
      { status: 500 },
    );
  }
}
