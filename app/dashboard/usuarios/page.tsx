import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { UsersTable } from "@/components/users/UsersTable";
import sql from "@/lib/db-postgres";
import type { PaginatedUsers, User } from "@/types/user";

export default async function UsuariosPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role === "USER") redirect("/dashboard");

  let initialData: PaginatedUsers;

  try {
    const isOperator = session.user.role === "OPERATOR";
    const roleFilter = isOperator
      ? sql`AND role IN ('OPERATOR', 'USER')`
      : sql``;

    const data = await sql<
      User[]
    >`SELECT id, name, email, role, status, first_access, created_at FROM users WHERE 1=1 ${roleFilter}
  ORDER BY created_at DESC
  LIMIT 8`;

    console.log("USERS DATA:", data);

    const [{ count }] = await sql`
      SELECT COUNT(*)::int as count FROM users WHERE 1=1 ${roleFilter}
    `;

    initialData = {
      data,
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
