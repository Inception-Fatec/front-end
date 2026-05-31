import sql from "@/lib/db-postgres";
import type { User } from "@/types/user";

export async function findUserByEmail(email: string): Promise<User | null> {
  const rows = await sql`
    SELECT id, name, email, role, status, first_access, created_at
    FROM users
    WHERE email = ${email.toLowerCase().trim()}
    LIMIT 1
  `;
  return (rows[0] as User) ?? null;
}

export async function findUserById(id: number): Promise<User | null> {
  const rows = await sql`
    SELECT id, name, email, role, status, first_access, created_at
    FROM users
    WHERE id = ${id}
    LIMIT 1
  `;
  return (rows[0] as User) ?? null;
}

export async function updateUserPassword(
  userId: number,
  hashedPassword: string,
): Promise<boolean> {
  try {
    await sql`
      UPDATE users SET password = ${hashedPassword} WHERE id = ${userId}
    `;
    return true;
  } catch (err) {
    console.error("[user.repository] Erro ao atualizar senha:", err);
    return false;
  }
}

export async function completeFirstAccess(
  userId: number,
  hashedPassword: string,
): Promise<boolean> {
  try {
    await sql`
      UPDATE users
      SET password = ${hashedPassword}, first_access = false
      WHERE id = ${userId}
    `;
    return true;
  } catch (err) {
    console.error("[user.repository] Erro ao completar primeiro acesso:", err);
    return false;
  }
}
