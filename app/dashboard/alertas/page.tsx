import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AlertsTabs } from "@/components/alerts/AlertTabs";

export default async function AlertasPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <AlertsTabs
      sessionRole={session.user.role as "ADMIN" | "OPERATOR" | "USER"}
    />
  );
}
