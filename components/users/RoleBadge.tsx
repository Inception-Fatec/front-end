import type { UserRole } from "@/types/user";

const CONFIG: Record<UserRole, { label: string; cls: string }> = {
  ADMIN: {
    label: "Administrador",
    cls: "bg-primary/15 text-primary border-primary/30",
  },
  OPERATOR: {
    label: "Operador",
    cls: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  },
  USER: {
    label: "Usuário",
    cls: "bg-border text-secondary-text border-border",
  },
};

export function RoleBadge({ role }: { role: UserRole }) {
  const { label, cls } = CONFIG[role];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${cls}`}
    >
      {label}
    </span>
  );
}
