import { supabaseAdmin } from "@/lib/supabase";
import type { User } from "@/types/user";

export async function findUserByEmail(email: string): Promise<User | null> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, name, email, role, status, first_access, created_at")
    .eq("email", email.toLowerCase().trim())
    .single();

  if (error || !data) return null;

  return data as User;
}

export async function findUserById(id: number): Promise<User | null> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, name, email, role, status, first_access, created_at")
    .eq("id", id)
    .single();

  if (error || !data) return null;

  return data as User;
}

export async function updateUserPassword(
  userId: number,
  hashedPassword: string,
): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("users")
    .update({ password: hashedPassword })
    .eq("id", userId);

  if (error) {
    console.error("[user.repository] Erro ao atualizar senha:", error);
    return false;
  }

  return true;
}