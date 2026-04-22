import { NextRequest, NextResponse } from "next/server";
import { resetPassword } from "@/services/password-reset.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, password } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Token é obrigatório." },
        { status: 400 },
      );
    }

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { error: "Senha é obrigatória." },
        { status: 400 },
      );
    }

    const result = await resetPassword(token, password);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(
      { message: "Senha redefinida com sucesso." },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 },
    );
  }
}
