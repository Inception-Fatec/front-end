import nodemailer from "nodemailer";

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  throw new Error("Credenciais do Gmail (EMAIL_USER ou EMAIL_PASS) não definidas.");
}

if (!process.env.NEXT_PUBLIC_APP_URL) {
  throw new Error("NEXT_PUBLIC_APP_URL não definida.");
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL;
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendPasswordResetEmail(
  email: string,
  token: string,
): Promise<void> {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;

  try {
    await transporter.sendMail({
      from: `"Tecsus" <${process.env.EMAIL_USER}>`,
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
  } catch (error) {
    console.error("[mail] Erro ao enviar email de reset via Nodemailer:", error);
    throw new Error("Erro ao enviar email de redefinição de senha.");
  }
}

export async function sendPasswordChangedEmail(email: string): Promise<void> {
  try {
    await transporter.sendMail({
      from: `"Tecsus" <${process.env.EMAIL_USER}>`,
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
  } catch (error) {
    console.error("[mail] Erro ao enviar email de confirmação via Nodemailer:", error);
  }
}