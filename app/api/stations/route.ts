import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const session = await auth();

    if (!session) {
        return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }
    try {
        const body = await req.json();
        const { name, id_datalogger } = body;

        if (!name || !id_datalogger) {
            return NextResponse.json(
                { error: "todos os campos são obrigatórios" },
                { status: 400 }
            );
        }

        const { data: existing } = await supabaseAdmin
            .from("stations")
            .select("id")
            .eq("name", name)
            .maybeSingle();

        if (existing) {
            return NextResponse.json(
                { error: "Nome já em uso" },
                { status: 409 }
            );
        }

        const { data: station, error } = await supabaseAdmin
            .from("stations")
            .insert({
                name,
                id_datalogger,
                status: true,
            })
            .select("id, name, id_datalogger, created_at")
            .maybeSingle();

        if (error || !station) {
            console.error("Supabase error ao criar estação:", error);
            return NextResponse.json(
                { error: "Erro ao criar estação." },
                { status: 500 }
            );
        }
        return NextResponse.json(
            {
                id: station.id,
                name: station.name,
                id_datalogger: station.id_datalogger,
                created_at: station.created_at,
            },
            { status: 201 }
        );
    } catch {
        return NextResponse.json(
            { error: "Erro interno do servidor." },
            { status: 500 }
        );
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
        const { id, name, id_datalogger, status } = body;

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

        return NextResponse.json(updated, { status: 200 });
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
                .select(`
                    *,
                    station_groupings ( id_grouping )
                `)
                .eq("id", id)
                .maybeSingle();

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
            .order("created_at", { ascending: false });

        if (error) throw error;
        return NextResponse.json(allStations, { status: 200 });

    } catch (error) {
        console.error("Erro no GET stations:", error);
        return NextResponse.json({ error: "Erro interno." }, { status: 500 });
    }
}