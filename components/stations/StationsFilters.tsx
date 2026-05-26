"use client";

import { Search } from "lucide-react";
import type { GroupingWithStationDetails } from "@/types/grouping";

interface StationFiltersProps {
  search: string;
  statusFilter: string;
  groupingFilter: string;
  groups: GroupingWithStationDetails[];
  onSearch: (v: string) => void;
  onStatusFilter: (v: string) => void;
  onGroupingFilter: (v: string) => void;
}

const STATUS_OPTIONS = [
  { value: "all", label: "Todos os Status" },
  { value: "active", label: "Ativa" },
  { value: "inactive", label: "Inativa" },
];

export function StationFilters({
  search,
  statusFilter,
  groupingFilter,
  groups,
  onSearch,
  onStatusFilter,
  onGroupingFilter,
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

      <div className="relative" data-tour-id="tour-station-groups-filter">
        <select
          value={groupingFilter}
          onChange={(e) => onGroupingFilter(e.target.value)}
          className="px-3 py-2 pr-8 rounded-lg bg-card-background border border-border text-sm text-secondary-text focus:outline-none focus:border-primary transition-colors appearance-none cursor-pointer min-w-[160px]"
        >
          <option value="all">Todos os Grupos</option>
          {groups.map((g) => (
            <option key={g.id} value={String(g.id)}>
              {g.name}
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-secondary-text"
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
        >
          <path
            d="M2.5 4.5L6 8l3.5-3.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}
