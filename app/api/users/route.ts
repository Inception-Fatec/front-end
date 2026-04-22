import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase";
import type { UserRole, User } from "@/types/user";

const PAGE_SIZE = 8;

export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const isAdmin = session.user.role === "ADMIN";
  const isOperator = session.user.role === "OPERATOR";

  if (!isAdmin && !isOperator) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.max(
    1,
    parseInt(searchParams.get("limit") ?? String(PAGE_SIZE), 10),
  );
  const search = searchParams.get("search") ?? "";
  const role = searchParams.get("role") ?? "";

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabaseAdmin
    .from("users")
    .select("id, name, email, role, status, first_access, created_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (isOperator) {
    query = query.in("role", ["OPERATOR", "USER"]);
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  if (role && role !== "all") {
    query = query.eq("role", role);
  }

  const {
    data: users,
    error,
    count,
  } = (await query) as {
    data: User[] | null;
    error: unknown;
    count: number | null;
  };

  if (error) {
    console.error("[GET /api/users] Supabase error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar usuários." },
      { status: 500 },
    );
  }

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return NextResponse.json(
    { data: users ?? [], total, page, totalPages },
    { status: 200 },
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const isAdmin = session.user.role === "ADMIN";
  const isOperator = session.user.role === "OPERATOR";

  if (!isAdmin && !isOperator) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  try {
    const body: {
      name: string;
      email: string;
      password: string;
      role: UserRole;
    } = await req.json();
    const { name, password, role } = body;

    const email = body.email?.toLowerCase().trim();

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: "name, email, password e role são obrigatórios." },
        { status: 400 },
      );
    }

    const supportedRoles: UserRole[] = ["ADMIN", "OPERATOR", "USER"];
    if (!supportedRoles.includes(role)) {
      return NextResponse.json(
        { error: `Role inválido: ${role}.` },
        { status: 400 },
      );
    }

    const allowedRoles: UserRole[] = isAdmin
      ? supportedRoles
      : ["OPERATOR", "USER"];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json(
        {
          error: `Você não tem permissão para criar um usuário com role ${role}.`,
        },
        { status: 403 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "A senha deve ter no mínimo 6 caracteres." },
        { status: 400 },
      );
    }

    const { data: existing } = await supabaseAdmin
      .from("users")
      .select("id")
      .ilike("email", email)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "Email já está em uso." },
        { status: 409 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data: user, error } = await supabaseAdmin
      .from("users")
      .insert({ name, email, password: hashedPassword, role, status: true })
      .select("id, name, email, role, created_at")
      .single();

    if (error || !user) {
      console.error("[POST /api/users] Supabase error:", error);
      return NextResponse.json(
        { error: "Erro ao criar usuário." },
        { status: 500 },
      );
    }

    return NextResponse.json(user, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 },
    );
  }
}
