import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase";
import type { UserRole, User } from "@/types/user"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
 
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
 
  const { id } = await params;
  const isAdmin = session.user.role === "ADMIN";
  const isSelf = session.user.id === id;
 
  if (!isAdmin && !isSelf) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }
 
  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select("id, name, email, role, status, created_at")
    .eq("id", id)
    .single() as { data: User | null , error: unknown};
 
  if (error || !user) {
    return NextResponse.json(
      { error: "Usuário não encontrado." },
      { status: 404 }
    );
  }
 
  return NextResponse.json(user, { status: 200 });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
 
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
 
  const { id } = await params;
  const isAdmin = session.user.role === "ADMIN";
  const isSelf = session.user.id === id;
 
  if (!isAdmin && !isSelf) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }
 
  try {
    const body = await req.json();
    const { name, email, password, role, status } = body;
 
    if ((role !== undefined || status !== undefined) && !isAdmin) {
      return NextResponse.json(
        { error: "Apenas ADMIN pode alterar role ou status." },
        { status: 403 }
      );
    }
 
    if (role !== undefined) {
      const validRoles: UserRole[] = ["ADMIN", "OPERATOR", "USER"];
      if (!validRoles.includes(role as UserRole)) {
        return NextResponse.json(
          { error: `role inválido. Valores aceitos: ${validRoles.join(", ")}` },
          { status: 400 }
        );
      }
    }
 
    if (password !== undefined && password.length < 6) {
      return NextResponse.json(
        { error: "A senha deve ter no mínimo 6 caracteres." },
        { status: 400 }
      );
    }
 
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (password !== undefined) updates.password = await bcrypt.hash(password, 10);
    if (role !== undefined) updates.role = role;
    if (status !== undefined) updates.status = status;
 
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "Nenhum campo para atualizar." },
        { status: 400 }
      );
    }
 
    const { data: user, error } = await supabaseAdmin
      .from("users")
      .update(updates)
      .eq("id", id)
      .select("id, name, email, role, status, created_at")
      .single() as {data : User | null , error : unknown};
 
    if (error || !user) {
      return NextResponse.json(
        { error: "Erro ao atualizar usuário." },
        { status: 500 }
      );
    }
 
    return NextResponse.json(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        created_at: user.created_at,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
 
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
 
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }
 
  const { id } = await params;
 
  if (session.user.id === id) {
    return NextResponse.json(
      { error: "Você não pode deletar sua própria conta." },
      { status: 400 }
    );
  }
 
  const { error } = await supabaseAdmin.from("users").delete().eq("id", id);
 
  if (error) {
    return NextResponse.json(
      { error: "Erro ao deletar usuário." },
      { status: 500 }
    );
  }
 
  return NextResponse.json(
    { message: "Usuário deletado com sucesso." },
    { status: 200 }
  );
}