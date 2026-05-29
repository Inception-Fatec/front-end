import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import sql from "@/lib/db-postgres";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password)
      return NextResponse.json({ error: "email e password são obrigatórios." }, { status: 400 });

    const rows = await sql`
      SELECT id, name, email, password, role, status
      FROM users
      WHERE email = ${email}
      LIMIT 1
    `;

    const user = rows[0];
    if (!user)
      return NextResponse.json({ error: "Credenciais inválidas." }, { status: 401 });

    if (!user.status)
      return NextResponse.json({ error: "Usuário inativo." }, { status: 403 });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return NextResponse.json({ error: "Credenciais inválidas." }, { status: 401 });

    return NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}