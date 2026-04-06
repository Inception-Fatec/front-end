import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { UsersTable } from "@/components/users/UsersTable";
import type { PaginatedUsers } from "@/types/user";

export default async function UsuariosPage() {
  const session = await auth();

  if (!session) redirect("/login");

  if (session.user.role === "USER") redirect("/dashboard");

  let initialData: PaginatedUsers;

  try {
    const { supabaseAdmin } = await import("@/lib/supabase");

    const isOperator = session.user.role === "OPERATOR";

    let query = supabaseAdmin
      .from("users")
      .select("id, name, email, role, status, first_access, created_at", {
        count: "exact",
      })
      .order("created_at", { ascending: false })
      .range(0, 7);

    if (isOperator) {
      query = query.in("role", ["OPERATOR", "USER"]);
    }

    const { data, count, error } = await query;

    if (error) throw error;

    initialData = {
      data: data ?? [],
      total: count ?? 0,
      page: 1,
      totalPages: Math.max(1, Math.ceil((count ?? 0) / 8)),
    };
  } catch {
    initialData = { data: [], total: 0, page: 1, totalPages: 1 };
  }

  return (
    <UsersTable
      initialData={initialData}
      sessionRole={session.user.role as "ADMIN" | "OPERATOR" | "USER"}
      sessionUserId={session.user.id}
    />
  );
}
