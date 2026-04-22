import { NextRequest, NextResponse } from "next/server";
import { requestPasswordReset } from "@/services/password-reset.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email é obrigatório." },
        { status: 400 },
      );
    }
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";

    const result = await requestPasswordReset(email.toLowerCase().trim(), ip);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 429 });
    }
    return NextResponse.json(
      {
        message:
          "Se este email estiver cadastrado, você receberá as instruções em breve.",
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 },
    );
  }
}