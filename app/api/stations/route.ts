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