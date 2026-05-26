"use client";

// components/dashboard/StationsTable.tsx

import { useState, useCallback, useEffect } from "react";
import { Search, BarChart2 } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { Skeleton } from "./Skeleton";
import type { PaginatedStations } from "@/types/station";
import { getStations } from "@/services/stations";
import { useRouter } from "next/navigation";
import { Pagination } from "@/components/Pagination";

const PAGE_SIZE = 4;

interface StationsTableProps {
  stations: PaginatedStations;
  isLoading: boolean;
}

export function StationsTable({ stations, isLoading }: StationsTableProps) {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PaginatedStations>(stations);
  const router = useRouter();

  useEffect(() => {
    setData(stations);
  }, [stations]);

  const fetchPage = useCallback(
    async (page: number, limit = PAGE_SIZE, s = search) => {
      setLoading(true);
      try {
        const result = await getStations({ page, limit, search: s });
        setData(result);
      } finally {
        setLoading(false);
      }
    },
    [search],
  );

  function handleSearch(value: string) {
    setSearch(value);
    fetchPage(1, PAGE_SIZE, value);
  }

  function timedifference(date_time: string | null) {
    if (!date_time) return "-";
    const agora = new Date().getTime();
    const data = new Date(date_time).getTime();
    const diffMs = agora - data;
    const segundos = Math.floor(diffMs / 1000);
    const minutos = Math.floor(segundos / 60);
    const horas = Math.floor(minutos / 60);
    const dias = Math.floor(horas / 24);
    if (dias > 0) return `${dias} dia${dias > 1 ? "s" : ""} atrás`;
    if (horas > 0) return `${horas}h atrás`;
    if (minutos > 0) return `${minutos}min atrás`;
    return `${segundos}s atrás`;
  }

  function TempoAtual({ date }: { date: string | null }) {
    const [, setTick] = useState(0);

    useEffect(() => {
      const i = setInterval(() => setTick((t) => t + 1), 1000);
      return () => clearInterval(i);
    }, []);

    return <>{timedifference(date)}</>;
  }

  return (
    <div
      data-tour-id="tour-dashboard-stations-card"
      className="bg-card-background border border-border rounded-xl overflow-hidden"
    >
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
            ) : data.data.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-sm text-secondary-text"
                >
                  Nenhuma estação encontrada.
                </td>
              </tr>
            ) : (
              data.data.map((station) => (
                <tr
                  key={station.id}
                  className="hover:bg-background/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground leading-tight">
                      {station.name}
                    </p>
                    <p className="text-[11px] text-secondary-text">
                      {station.address}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      status={station.status ? "online" : "offline"}
                    />
                  </td>
                  <td className="px-4 py-3 text-secondary-text text-xs text-center hidden sm:table-cell">
                    <TempoAtual date={station.last_measurement} />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() =>
                        router.push(
                          `/dashboard/estacoes?stationId=${station.id}`,
                        )
                      }
                      className="px-3 py-1 text-xs rounded-lg bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors whitespace-nowrap"
                    >
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
        {!isLoading && !loading && (
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-secondary-text">
              {data.pagination.total === 0
                ? "Nenhum resultado"
                : `${(data.pagination.page - 1) * PAGE_SIZE + 1}–${Math.min(data.pagination.page * PAGE_SIZE, data.pagination.total)} de ${data.pagination.total} estações`}
            </span>
          </div>
        )}

        {!isLoading && !loading && (
          <Pagination
            currentPage={data.pagination.page}
            totalPages={data.pagination.totalPages}
            loading={loading}
            onPageChange={fetchPage}
          />
        )}
      </div>
    </div>
  );
}
