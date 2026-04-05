import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import type { Station, CreateStation, UpdateStation, StationWithGroupings, PaginatedStations } from "@/types/station";
import type { ParameterWithType } from "@/types/parameter";
import type { Alert } from "@/types/alert";

type StationWithDetails = StationWithGroupings & {
    parameters: (ParameterWithType & {
        alert_parameters: { alerts: Alert }[];
    })[];
};

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

    try {
        const body: CreateStation & { parameters?: number[] } = await req.json();
        const { name, id_datalogger, address, latitude, longitude, parameters } = body;

        if (!name || !id_datalogger) {
            return NextResponse.json({ error: "todos os campos são obrigatórios" }, { status: 400 });
        }

        const { data: existing } = await supabaseAdmin
            .from("stations")
            .select("id")
            .eq("name", name)
            .maybeSingle();

        if (existing) return NextResponse.json({ error: "Nome já em uso" }, { status: 409 });

        const { data: station, error } = await supabaseAdmin
            .from("stations")
            .insert({ name, id_datalogger, address, latitude, longitude, status: true })
            .select()
            .maybeSingle();

        if (error) {
            console.error("Supabase error ao criar estação:", error);
            return NextResponse.json({ error: "Erro ao criar estação." }, { status: 500 });
        }
        if (!station) return NextResponse.json({ error: "Erro ao criar estação." }, { status: 500 });

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
                return NextResponse.json({ error: "Estação criada mas erro ao vincular parâmetros." }, { status: 500 });
            }
        }

        return NextResponse.json(station as Station, { status: 201 });

    } catch {
        return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

    try {
        const { id } = await req.json();
        if (!id) return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });

        const { error } = await supabaseAdmin
            .from("stations")
            .delete()
            .eq("id", id);

        if (error) {
            console.error("Erro ao deletar estação:", error);
            return NextResponse.json({ error: "Erro ao deletar estação." }, { status: 500 });
        }

        return NextResponse.json({ message: "Estação deletada com sucesso." }, { status: 200 });

    } catch {
        return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
    }
}


export async function PUT(req: NextRequest) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const role = session.user.role;
    if (role === "USER") return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

    try {
        const body: UpdateStation & { action?: "rename" | "disable"; parameters?: number[] } = await req.json();
        const { id, action, name, id_datalogger, status, address, latitude, longitude, parameters } = body;

        if (!id) return NextResponse.json({ error: "id é obrigatório." }, { status: 400 });

        if (role === "OPERATOR") {
            if (action === "rename") {
                if (!name) return NextResponse.json({ error: "name é obrigatório." }, { status: 400 });

                const { data: existing } = await supabaseAdmin
                    .from("stations")
                    .select("id")
                    .eq("name", name)
                    .neq("id", id)
                    .maybeSingle();

                if (existing) return NextResponse.json({ error: "Nome já em uso." }, { status: 409 });

                const { data, error } = await supabaseAdmin
                    .from("stations")
                    .update({ name })
                    .eq("id", id)
                    .select()
                    .maybeSingle();

                if (error) {
                    console.error("Supabase error ao renomear estação:", error);
                    return NextResponse.json({ error: "Erro ao atualizar estação." }, { status: 500 });
                }
                if (!data) return NextResponse.json({ error: "Estação não encontrada." }, { status: 404 });

                return NextResponse.json(data as Station, { status: 200 });
            }

            if (action === "disable") {
                if (status === undefined) return NextResponse.json({ error: "status é obrigatório." }, { status: 400 });

                const { data, error } = await supabaseAdmin
                    .from("stations")
                    .update({ status })
                    .eq("id", id)
                    .select()
                    .maybeSingle();

                if (error) {
                    console.error("Supabase error ao desativar estação:", error);
                    return NextResponse.json({ error: "Erro ao atualizar estação." }, { status: 500 });
                }
                if (!data) return NextResponse.json({ error: "Estação não encontrada." }, { status: 404 });

                return NextResponse.json(data as Station, { status: 200 });
            }

            return NextResponse.json({ error: "action inválida. Use 'rename' ou 'disable'." }, { status: 400 });
        }

        if (name) {
            const { data: existing } = await supabaseAdmin
                .from("stations")
                .select("id")
                .eq("name", name)
                .neq("id", id)
                .maybeSingle();

            if (existing) return NextResponse.json({ error: "Nome já em uso." }, { status: 409 });
        }

        const { data, error } = await supabaseAdmin
            .from("stations")
            .update({ name, id_datalogger, status, address, latitude, longitude })
            .eq("id", id)
            .select()
            .maybeSingle();

        if (error) {
            console.error("Supabase error ao atualizar estação:", error);
            return NextResponse.json({ error: "Erro ao atualizar estação." }, { status: 500 });
        }
        if (!data) return NextResponse.json({ error: "Estação não encontrada." }, { status: 404 });

        if (Array.isArray(parameters) && parameters.length > 0) {
            const { error: deleteError } = await supabaseAdmin
                .from("parameters")
                .delete()
                .eq("id_station", id);

            if (deleteError) {
                console.error("Supabase error ao remover parâmetros antigos:", deleteError);
                return NextResponse.json({ error: "Erro ao atualizar parâmetros." }, { status: 500 });
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
                return NextResponse.json({ error: "Erro ao atualizar parâmetros." }, { status: 500 });
            }
        }

        return NextResponse.json(data as Station, { status: 200 });

    } catch {
        return NextResponse.json({ error: "Erro interno ao atualizar." }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    try {
        if (id) {
            const { data: station, error } = await supabaseAdmin
                .from("stations")
                .select(`
          *,
          station_groupings ( id_grouping ),
          parameters (
            *,
            parameter_types ( * ),
            alert_parameters (
              alerts ( * )
            )
          )
        `)
                .eq("id", id)
                .maybeSingle() as { data: StationWithDetails | null; error: unknown };

            if (error) throw error;
            if (!station) return NextResponse.json({ error: "Estação não encontrada" }, { status: 404 });

            return NextResponse.json(station, { status: 200 });
        }

        if (session.user.role !== "ADMIN") {
            return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
        }

        const url = new URL(req.url);
        const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
        const search = url.searchParams.get("search") || "";
        const rawLimit = url.searchParams.get("limit");
        const isAll = rawLimit === "all";

        const limit = isAll
            ? null
            : Math.min(Math.max(Number(url.searchParams.get("limit") ?? 10), 1), 50);

        let query = supabaseAdmin
            .from("stations")
            .select(`
        *,
        parameters ( * )
      `, { count: "exact" })
            .order("created_at", { ascending: false });

        if (search) {
            query = query.ilike("name", `%${search}%`);
        }

        if (!isAll && limit !== null) {
            const from = (page - 1) * limit;
            const to = from + limit - 1;
            query = query.range(from, to);
        }

        const { data, error, count } = await query;

        if (error) throw error;

        return NextResponse.json({
            data,
            pagination: {
                page,
                limit: isAll ? "all" : limit,
                total: count,
                totalPages: isAll
                    ? 1
                    : Math.ceil((count || 0) / (limit || 1)),
            },
        } as PaginatedStations, { status: 200 });

    } catch (error) {
        console.error("Erro no GET stations:", error);
        return NextResponse.json({ error: "Erro interno." }, { status: 500 });
    }
}