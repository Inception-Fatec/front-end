import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import sql from "@/lib/db-postgres";
import type { UserRole, User } from "@/types/user";

async function canManageTarget(
  sessionRole: UserRole,
  sessionId: string,
  targetId: string,
): Promise<{ allowed: boolean; targetRole?: UserRole }> {
  if (sessionRole === "ADMIN") return { allowed: true };

  const rows = await sql`SELECT role FROM users WHERE id = ${targetId} LIMIT 1`;
  const targetRole = rows[0]?.role as UserRole | undefined;

  if (sessionRole === "OPERATOR") {
    const isSelf = sessionId === targetId;
    const isManageable = targetRole === "OPERATOR" || targetRole === "USER";
    return { allowed: isSelf || isManageable, targetRole };
  }

  return { allowed: false, targetRole };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id } = await params;
  const { allowed } = await canManageTarget(session.user.role as UserRole, session.user.id, id);
  if (!allowed)
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

  const rows = await sql<User[]>`
    SELECT id, name, email, role, status, first_access, created_at
    FROM users WHERE id = ${id} LIMIT 1
  `;

  if (rows.length === 0)
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

  return NextResponse.json(rows[0], { status: 200 });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id } = await params;
  const sessionRole = session.user.role as UserRole;
  const isAdmin = sessionRole === "ADMIN";
  const { allowed } = await canManageTarget(sessionRole, session.user.id, id);
  if (!allowed)
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

  try {
    const body = await req.json();
    const { name, email, password, role, status } = body;

    if (role !== undefined && role === "ADMIN" && !isAdmin)
      return NextResponse.json({ error: "Você não tem permissão para atribuir role ADMIN." }, { status: 403 });

    if (role !== undefined) {
      const validRoles: UserRole[] = ["ADMIN", "OPERATOR", "USER"];
      if (!validRoles.includes(role))
        return NextResponse.json({ error: `role inválido.` }, { status: 400 });
    }

    if (password !== undefined && password.length < 6)
      return NextResponse.json({ error: "A senha deve ter no mínimo 6 caracteres." }, { status: 400 });

    const fields: Record<string, unknown> = {};
    if (name !== undefined) fields.name = name;
    if (email !== undefined) fields.email = email.toLowerCase().trim();
    if (password !== undefined) fields.password = await bcrypt.hash(password, 10);
    if (role !== undefined) fields.role = role;
    if (status !== undefined) fields.status = status;

    if (Object.keys(fields).length === 0)
      return NextResponse.json({ error: "Nenhum campo para atualizar." }, { status: 400 });

    const setClauses = Object.keys(fields)
      .map((k, i) => `${k} = $${i + 2}`)
      .join(", ");
    const values = [id, ...Object.values(fields)];

    const rows = await sql.unsafe(
      `UPDATE users SET ${setClauses} WHERE id = $1 RETURNING id, name, email, role, status, first_access, created_at`,
      values,
    );

    if (rows.length === 0)
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

    return NextResponse.json(rows[0], { status: 200 });
  } catch {
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id } = await params;
  const sessionRole = session.user.role as UserRole;

  if (session.user.id === id)
    return NextResponse.json({ error: "Você não pode deletar sua própria conta." }, { status: 400 });

  const { allowed } = await canManageTarget(sessionRole, session.user.id, id);
  if (!allowed)
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

  await sql`DELETE FROM users WHERE id = ${id}`;

  return NextResponse.json({ message: "Usuário deletado com sucesso." }, { status: 200 });
}