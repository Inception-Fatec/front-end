import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY não definida.");
}

if (!process.env.NEXT_PUBLIC_APP_URL) {
  throw new Error("NEXT_PUBLIC_APP_URL não definida.");
}

const resend = new Resend(process.env.RESEND_API_KEY);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

export async function sendPasswordResetEmail(
  email: string,
  token: string,
): Promise<void> {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;

  const { error } = await resend.emails.send({
    from: "Tecsus <noreply@seudominio.com.br>",
    to: email,
    subject: "Redefinição de senha — Tecsus",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1a8cff;">Redefinição de senha</h2>
        <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
        <p>Clique no botão abaixo para criar uma nova senha. 
           Este link expira em <strong>15 minutos</strong>.</p>
        <a
          href="${resetUrl}"
          style="
            display: inline-block;
            margin: 24px 0;
            padding: 12px 24px;
            background-color: #1a8cff;
            color: #ffffff;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
          "
        >
          Redefinir senha
        </a>
        <p style="color: #64748b; font-size: 13px;">
          Se você não solicitou a redefinição, ignore este email. 
          Sua senha permanece a mesma.
        </p>
        <p style="color: #64748b; font-size: 13px;">
          Se o botão não funcionar, copie e cole o link abaixo no navegador:
          <br />
          <span style="color: #1a8cff;">${resetUrl}</span>
        </p>
      </div>
    `,
  });

  if (error) {
    console.error("[mail] Erro ao enviar email de reset:", error);
    throw new Error("Erro ao enviar email de redefinição de senha.");
  }
}

export async function sendPasswordChangedEmail(email: string): Promise<void> {
  const { error } = await resend.emails.send({
    from: "Tecsus <noreply@seudominio.com.br>",
    to: email,
    subject: "Senha alterada com sucesso — Tecsus",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1a8cff;">Senha alterada</h2>
        <p>A senha da sua conta foi alterada com sucesso.</p>
        <p style="color: #64748b; font-size: 13px;">
          Se você não realizou essa alteração, entre em contato com o 
          administrador do sistema imediatamente.
        </p>
      </div>
    `,
  });

  if (error) {
    console.error("[mail] Erro ao enviar email de confirmação:", error);
  }
}