import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase";
import type { UserRole, User } from "@/types/user"
 
export async function GET() {
  const session = await auth();
 
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
 
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }
 
  const { data: users, error } = await supabaseAdmin
    .from("users")
    .select("id, name, email, role, status, created_at")
    .order("created_at", { ascending: false }) as { data: User[] | null , error:unknown };
 
  if (error) {
    return NextResponse.json(
      { error: "Erro ao buscar usuários." },
      { status: 500 }
    );
  }
 
  return NextResponse.json(users, { status: 200 });
}
 
export async function POST(req: NextRequest) {
  const session = await auth();
 
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
 
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }
 
  try {
    const body: Pick<User, "name" | "email" | "role"> & { password: string } = await req.json();
    const { name, email, password, role } = body;
 
    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: "name, email, password e role são obrigatórios." },
        { status: 400 }
      );
    }
 
    const validRoles: UserRole[] = ["ADMIN", "OPERATOR", "USER"];
    if (!validRoles.includes(role as UserRole)) {
      return NextResponse.json(
        { error: `role inválido. Valores aceitos: ${validRoles.join(", ")}` },
        { status: 400 }
      );
    }
 
    if (password.length < 6) {
      return NextResponse.json(
        { error: "A senha deve ter no mínimo 6 caracteres." },
        { status: 400 }
      );
    }
 
    const { data: existing } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", email)
      .single();
 
    if (existing) {
      return NextResponse.json(
        { error: "Email já está em uso." },
        { status: 409 }
      );
    }
 
    const hashedPassword = await bcrypt.hash(password, 10);
 
    const { data: user, error } = await supabaseAdmin
      .from("users")
      .insert({
        name,
        email,
        password: hashedPassword,
        role: role as UserRole,
        status: true,
      })
      .select("id, name, email, role, created_at")
      .single();
 
    if (error || !user) {
      console.error("Supabase error ao criar usuário:", error);
      return NextResponse.json(
        { error: "Erro ao criar usuário." },
        { status: 500 }
      );
    }
 
    return NextResponse.json(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
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