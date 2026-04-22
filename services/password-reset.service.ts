import bcrypt from "bcryptjs";
import { checkRateLimit } from "@/lib/rate-limit";
import { generateToken, hashToken } from "@/lib/crypto";
import { sendPasswordResetEmail, sendPasswordChangedEmail } from "@/lib/mail";
import { findUserByEmail } from "@/repositories/user.repository";
import { updateUserPassword } from "@/repositories/user.repository";
import {
  saveToken,
  findToken,
  deleteToken,
  invalidatePreviousToken,
} from "@/repositories/token.repository";
import type { PasswordResetServiceResult } from "@/types/password-reset";

export async function requestPasswordReset(
  email: string,
  ip: string,
): Promise<PasswordResetServiceResult> {
  /*
  const ipLimit = await checkRateLimit(`ip:${ip}`);
  if (!ipLimit.allowed) {
    return {
      success: false,
      error: `Muitas tentativas. Tente novamente em ${Math.ceil((ipLimit.retryAfterSeconds ?? 900) / 60)} minutos.`,
    };
  }

  const emailLimit = await checkRateLimit(`email:${email}`);
  if (!emailLimit.allowed) {
    return {
      success: false,
      error: `Muitas tentativas. Tente novamente em ${Math.ceil((emailLimit.retryAfterSeconds ?? 900) / 60)} minutos.`,
    };
  } */
  const user = await findUserByEmail(email);
  if (!user) {
    return { success: true };
  }
  await invalidatePreviousToken(user.id);
  const rawToken = generateToken();
  const hashedToken = hashToken(rawToken);

  await saveToken(hashedToken, {
    userId: user.id,
    email: user.email,
    createdAt: new Date().toISOString(),
  });

  await sendPasswordResetEmail(user.email, rawToken);

  return { success: true };
}

export async function resetPassword(
  rawToken: string,
  newPassword: string,
): Promise<PasswordResetServiceResult> {
  if (!rawToken || !newPassword) {
    return { success: false, error: "Token e senha são obrigatórios." };
  }

  if (newPassword.length < 6) {
    return {
      success: false,
      error: "A senha deve ter no mínimo 6 caracteres.",
    };
  }

  const hashedToken = hashToken(rawToken);
  const payload = await findToken(hashedToken);

  if (!payload) {
    return {
      success: false,
      error: "Token inválido ou expirado. Solicite um novo link.",
    };
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  const updated = await updateUserPassword(payload.userId, hashedPassword);

  if (!updated) {
    return {
      success: false,
      error: "Erro ao atualizar a senha. Tente novamente.",
    };
  }

  await deleteToken(hashedToken, payload.userId);
  await sendPasswordChangedEmail(payload.email);

  return { success: true };
}
