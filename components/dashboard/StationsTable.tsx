"use client";

// components/dashboard/StationsTable.tsx

import { useState, useMemo } from "react";
import { Search, ChevronLeft, ChevronRight, BarChart2 } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { LastUpdated } from "./LastUpdated";
import { Skeleton } from "./Skeleton";
import type { StationRow } from "@/types/api";

const PAGE_SIZE = 4;

interface StationsTableProps {
  stations: StationRow[];
  totalCount: number;
  isLoading: boolean;
  onRefresh: () => void;
}

export function StationsTable({
  stations,
  isLoading,
  onRefresh,
}: StationsTableProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return stations.filter((s) => s.name.toLowerCase().includes(q));
  }, [stations, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleRefresh() {
    setPage(1);
    onRefresh();
  }

  return (
    <div className="bg-card-background border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-border">
        <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
          <BarChart2 size={16} className="text-primary" />
          Status das Estações
        </div>
        <div className="relative w-full sm:w-56">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text"
          />
          <input
            type="text"
            placeholder="Buscar estação..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-secondary-text focus:outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-[11px] uppercase tracking-wider text-secondary-text">
              <th className="text-left px-4 py-2.5 font-medium">Estação</th>
              <th className="text-left px-4 py-2.5 font-medium">Status</th>
              <th className="text-left px-4 py-2.5 font-medium hidden sm:table-cell">
                Última Com.
              </th>
              <th className="text-left px-4 py-2.5 font-medium">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 4 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <Skeleton className="h-4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : paginated.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-sm text-secondary-text"
                >
                  Nenhuma estação encontrada.
                </td>
              </tr>
            ) : (
              paginated.map((station) => (
                <tr
                  key={station.id}
                  className="hover:bg-background/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground leading-tight">
                      {station.name}
                    </p>
                    <p className="text-[11px] text-secondary-text">
                      {station.location}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={station.status} />
                  </td>
                  <td className="px-4 py-3 text-secondary-text text-xs hidden sm:table-cell">
                    {station.lastComm}
                  </td>
                  <td className="px-4 py-3">
                    <button className="px-3 py-1 text-xs rounded-lg bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors whitespace-nowrap">
                      Ver Detalhes
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-border">
        {!isLoading && (
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-secondary-text">
              {filtered.length === 0
                ? "Nenhum resultado"
                : `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filtered.length)} de ${filtered.length} estações`}
            </span>
            <LastUpdated onRefresh={handleRefresh} />
          </div>
        )}

        {!isLoading && totalPages > 1 && (
          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded hover:bg-background transition-colors text-secondary-text disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={14} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={[
                  "w-6 h-6 rounded text-xs font-semibold transition-colors",
                  n === currentPage
                    ? "bg-primary text-white"
                    : "hover:bg-background text-secondary-text",
                ].join(" ")}
              >
                {n}
              </button>
            ))}

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded hover:bg-background transition-colors text-secondary-text disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
