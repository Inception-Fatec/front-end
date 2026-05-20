import { auth } from "@/auth";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { completeFirstAccess } from "@/repositories/user.repository";

export async function POST(req: Request) {
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json(
      { error: "Não autorizado. Inicie sessão novamente." },
      { status: 401 }
    );
  }

  if (!session.user.first_access) {
    return NextResponse.json(
      { error: "Operação não permitida para este perfil." },
      { status: 403 }
    );
  }

  try {
    const { password } = await req.json();

    if (!password || password.trim().length < 6) {
      return NextResponse.json(
        { error: "A senha deve conter pelo menos 6 caracteres." },
        { status: 400 }
      );
    }

    const userId = Number(session.user.id);
    
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const success = await completeFirstAccess(userId, hashedPassword);

    if (!success) {
      return NextResponse.json(
        { error: "Houve um erro técnico ao atualizar a senha no banco de dados." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Senha de primeiro acesso configurada com sucesso.",
    });
  } catch (error) {
    console.error("[api/users/first-access] Erro interno:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor ao processar a requisição." },
      { status: 500 }
    );
  }
}