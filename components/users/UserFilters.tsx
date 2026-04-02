import { Search } from "lucide-react";
import type { UserRole } from "@/types/user";

interface UserFiltersProps {
  search: string;
  roleFilter: string;
  sessionRole: UserRole;
  onSearch: (v: string) => void;
  onRoleFilter: (v: string) => void;
}

const ROLE_OPTIONS: { value: string; label: string; allowedFor: UserRole[] }[] =
  [
    {
      value: "all",
      label: "Todos os Perfis",
      allowedFor: ["ADMIN", "OPERATOR"],
    },
    { value: "ADMIN", label: "Administrador", allowedFor: ["ADMIN"] },
    { value: "OPERATOR", label: "Operador", allowedFor: ["ADMIN", "OPERATOR"] },
    { value: "USER", label: "Usuário", allowedFor: ["ADMIN", "OPERATOR"] },
  ];

export function UserFilters({
  search,
  roleFilter,
  sessionRole,
  onSearch,
  onRoleFilter,
}: UserFiltersProps) {
  const visibleOptions = ROLE_OPTIONS.filter((o) =>
    o.allowedFor.includes(sessionRole),
  );

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text"
        />
        <input
          type="text"
          placeholder="Buscar usuários por nome ou email..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-lg bg-card-background border border-border text-sm text-foreground placeholder:text-secondary-text focus:outline-none focus:border-primary transition-colors"
        />
      </div>
      <select
        value={roleFilter}
        onChange={(e) => onRoleFilter(e.target.value)}
        className="px-3 py-2 rounded-lg bg-card-background border border-border text-sm text-secondary-text focus:outline-none focus:border-primary transition-colors"
      >
        {visibleOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
