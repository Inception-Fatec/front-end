import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import type { Station, CreateStation, UpdateStation, StationWithGroupings } from "@/types/station";

export async function POST(req: NextRequest) {
    const session = await auth();

    if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

    try {
        const body = await req.json();
        const { name, address, latitude, longitude, id_datalogger, groupings } = body;


        if (!name || !address || !latitude || !longitude || !id_datalogger) {
            return NextResponse.json({ error: "todos os campos são obrigatórios" }, { status: 400 });
        }

        const { data: existing } = await supabaseAdmin
            .from("stations")
            .select("id")
            .eq("name", name)
            .maybeSingle();

        if (existing) return NextResponse.json({ error: "Nome já em uso" }, { status: 409 });


        if (groupings && Array.isArray(groupings) && groupings.length > 0) {

            const groupIds = groupings.map((g: any) => typeof g === "number" ? g : g.id_grouping);


            const { data: validGroups, error: checkError } = await supabaseAdmin
                .from("groupings")
                .select("id")
                .in("id", groupIds);

            if (checkError) throw checkError;

            if (!validGroups || validGroups.length !== groupIds.length) {
                return NextResponse.json(
                    { error: "Um ou mais grupos informados não existem no sistema." },
                    { status: 400 }
                );
            }
        }
        const { data: station, error: stationError } = await supabaseAdmin
            .from("stations")
            .insert({
                name,
                address,
                latitude,
                longitude,
                id_datalogger,
                status: true,
            })
            .select("id")
            .maybeSingle();

        if (stationError || !station) {
            return NextResponse.json({ error: "Erro ao criar estação." }, { status: 500 });
        }

        if (groupings && Array.isArray(groupings) && groupings.length > 0) {
            const stationGroupings = groupings.map((g: any) => ({
                id_station: station.id,
                id_grouping: typeof g === "number" ? g : g.id_grouping
            }));

            await supabaseAdmin.from("station_groupings").insert(stationGroupings);
        }

        const { data: stationWithGroupings } = await supabaseAdmin
            .from("stations")
            .select(` * , station_groupings ( id_grouping ) `)
            .eq("id", station.id)
            .maybeSingle();

        return NextResponse.json(stationWithGroupings, { status: 201 });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    const session = await auth();

    if (!session) {
        return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }
    try {
        const body = await req.json();
        const { id } = body;

        if (!id) {
            return NextResponse.json(
                { error: "id é obrigatório" },
                { status: 400 }
            );
        }

        const { error } = await supabaseAdmin
            .from("stations")
            .delete()
            .eq("id", id);

        if (error) {
            console.error("Erro ao deletar:", error);
            return NextResponse.json(
                { error: "Erro ao deletar estação" },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { message: "Estação deletada com sucesso" },
            { status: 200 }
        );

    } catch {
        return NextResponse.json(
            { error: "Erro interno do servidor." },
            { status: 500 }
        );
    }
}

export async function PUT(req: NextRequest) {
    const session = await auth();

    if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    if (session.user.role === "USER") {
        return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { id, name, id_datalogger, status, groupings } = body;

        if (!id) return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });

        if (name) {
            const { data: existing } = await supabaseAdmin
                .from("stations")
                .select("id")
                .eq("name", name)
                .neq("id", id)
                .maybeSingle();
            if (existing) return NextResponse.json({ error: "Nome já em uso" }, { status: 409 });
        }

        const { data: updated, error } = await supabaseAdmin
            .from("stations")
            .update({ name, id_datalogger, status })
            .eq("id", id)
            .select()
            .maybeSingle();

        if (error) throw error;

        if (groupings !== undefined) {

            const { error: deleteError } = await supabaseAdmin
                .from("station_groupings")
                .delete()
                .eq("id_station", id);

            if (deleteError) {
                return NextResponse.json(
                    { error: "Erro ao atualizar grupos." },
                    { status: 500 }
                );
            }

            if (Array.isArray(groupings) && groupings.length > 0) {

                const stationGroupings = groupings.map((g: any) => ({
                    id_station: id,
                    id_grouping: typeof g === "number" ? g : g.id_grouping
                }));

                const { error: insertError } = await supabaseAdmin
                    .from("station_groupings")
                    .insert(stationGroupings);

                if (insertError) {
                    return NextResponse.json(
                        { error: "Erro ao inserir grupos." },
                        { status: 500 }
                    );
                }
            }
        }
        const { data: stationWithGroupings, error: fetchError } = await supabaseAdmin
            .from("stations")
            .select(`*, station_groupings ( id_grouping )`)
            .eq("id", id)
            .maybeSingle();

        if (fetchError || !stationWithGroupings) {
            return NextResponse.json(
                { error: "Erro ao buscar estação atualizada." },
                { status: 500 }
            );
        }

        return NextResponse.json(stationWithGroupings, { status: 200 });

    } catch (error) {
        return NextResponse.json({ error: "Erro interno ao atualizar." }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    const session = await auth();

    if (!session) {
        return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    try {
        if (id) {
            const { data: station, error } = await supabaseAdmin
                .from("stations")
                .select(`*,station_groupings ( id_grouping )`)
                .eq("id", id)
                .maybeSingle() as { data: StationWithGroupings | null ,error:unknown};

            if (error) throw error;
            if (!station) return NextResponse.json({ error: "Estação não encontrada" }, { status: 404 });

            return NextResponse.json(station, { status: 200 });
        }

        if (session.user.role !== "ADMIN") {
            return NextResponse.json(
                { error: "Acesso negado. Apenas administradores podem listar tudo." },
                { status: 403 }
            );
        }

        const { data: allStations, error } = await supabaseAdmin
            .from("stations")
            .select("*")
            .order("created_at", { ascending: false }) as { data: Station[] | null , error: unknown};

        if (error) throw error;
        return NextResponse.json(allStations, { status: 200 });

    } catch (error) {
        console.error("Erro no GET stations:", error);
        return NextResponse.json({ error: "Erro interno." }, { status: 500 });
    }
}