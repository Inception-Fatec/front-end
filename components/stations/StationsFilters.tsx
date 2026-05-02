"use client";

import { Search } from "lucide-react";

interface StationFiltersProps {
  search: string;
  statusFilter: string;
  onSearch: (v: string) => void;
  onStatusFilter: (v: string) => void;
}

const STATUS_OPTIONS = [
  { value: "all", label: "Todos os Status" },
  { value: "active", label: "Ativa" },
  { value: "inactive", label: "Inativa" },
];

export function StationFilters({
  search,
  statusFilter,
  onSearch,
  onStatusFilter,
}: StationFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text"
        />
        <input
          type="text"
          placeholder="Buscar estação por nome..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-lg bg-card-background border border-border text-sm text-foreground placeholder:text-secondary-text focus:outline-none focus:border-primary transition-colors"
        />
      </div>
      <select
        value={statusFilter}
        onChange={(e) => onStatusFilter(e.target.value)}
        className="px-3 py-2 rounded-lg bg-card-background border border-border text-sm text-secondary-text focus:outline-none focus:border-primary transition-colors"
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
