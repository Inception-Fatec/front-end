import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// POST /api/auth/login
// O NextAuth /api/auth/callback/credentials continua existindo para o browser
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "email e password são obrigatórios." },
        { status: 400 }
      );
    }

    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("id, name, email, password, role, status")
      .eq("email", email)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: "Credenciais inválidas." },
        { status: 401 }
      );
    }

    if (!user.status) {
      return NextResponse.json(
        { error: "Usuário inativo." },
        { status: 403 }
      );
    }

    // ⚠️ TODO: quando as senhas forem migradas para bcrypt, substituir por:
    // const match = await bcrypt.compare(password, user.password);
    // if (!match) { ... }
    if (password !== user.password) {
      return NextResponse.json(
        { error: "Credenciais inválidas." },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
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