import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import sql from "@/lib/db-postgres";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password } = body;

    if (!name || !email || !password)
      return NextResponse.json({ error: "name, email e password são obrigatórios." }, { status: 400 });

    if (password.length < 6)
      return NextResponse.json({ error: "A senha deve ter no mínimo 6 caracteres." }, { status: 400 });

    const existing = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
    if (existing.length > 0)
      return NextResponse.json({ error: "Email já está em uso." }, { status: 409 });

    const hashedPassword = await bcrypt.hash(password, 10);

    const [user] = await sql`
      INSERT INTO users (name, email, password, role, status)
      VALUES (${name}, ${email}, ${hashedPassword}, 'USER', true)
      RETURNING id, name, email, role, created_at
    `;

    return NextResponse.json(user, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}