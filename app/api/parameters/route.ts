import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import type { ParameterType } from "@/types/parameter";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const rawLimit = url.searchParams.get("limit");
    const isAll = rawLimit === "all";

    const limit = isAll
      ? null
      : Math.min(Math.max(Number(rawLimit ?? 10), 1), 50);

    let query = supabaseAdmin
      .from("parameter_types")
      .select("*", { count: "exact" })
      .order("id", { ascending: true });

    if (!isAll && limit !== null) {
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return NextResponse.json(
      {
        data: data as ParameterType[],
        pagination: {
          page,
          limit: isAll ? "all" : limit,
          total: count,
          totalPages: isAll
            ? 1
            : Math.ceil((count || 0) / (limit || 1)),
        },
      }, { status: 200 });

  } catch (error) {
    console.error("Erro no GET parameter_types:", error);
    return NextResponse.json({ error: "Erro ao buscar tipos de parâmetro" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  try {
    const body: Omit<ParameterType, "id"> = await req.json();
    const { name, unit, symbol, factor_value, offset_value, json_name } = body;

    if (!name) {
      return NextResponse.json({ error: "name é obrigatório" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("parameter_types")
      .insert({ name, unit, symbol, factor_value, offset_value, json_name })
      .select()
      .maybeSingle();

    if (error) {
      console.error("Supabase error ao criar tipo de parâmetro:", error);
      return NextResponse.json({ error: "Erro ao criar tipo de parâmetro" }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: "Erro ao criar tipo de parâmetro" }, { status: 500 });

    return NextResponse.json(data as ParameterType, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  try {
    const body: Partial<Omit<ParameterType, "id">> & { id: number } = await req.json();
    const { id, name, unit, symbol, factor_value, offset_value, json_name } = body;

    if (!id) return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from("parameter_types")
      .update({ name, unit, symbol, factor_value, offset_value, json_name })
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      console.error("Supabase error ao atualizar tipo de parâmetro:", error);
      return NextResponse.json({ error: "Erro ao atualizar tipo de parâmetro" }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: "Tipo de parâmetro não encontrado" }, { status: 404 });

    return NextResponse.json(data as ParameterType, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Erro interno ao atualizar." }, { status: 500 });
  }
}