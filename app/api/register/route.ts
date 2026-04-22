import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase";
import type { User } from "@/types/user";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "name, email e password são obrigatórios." },
        { status: 400 },
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
      .eq("email", email)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "Email já está em uso." },
        { status: 409 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data: user, error } = (await supabaseAdmin
      .from("users")
      .insert({
        name,
        email,
        password: hashedPassword,
        role: "USER",
        status: true,
      })
      .select("id, name, email, role, created_at")
      .single()) as { data: User | null; error: unknown };

    if (error || !user) {
      console.error("Supabase error ao criar usuário:", error);
      return NextResponse.json(
        { error: "Erro ao criar usuário." },
        { status: 500 },
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
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 },
    );
  }
}
