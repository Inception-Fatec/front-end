"use client";

import { useState, useCallback, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Settings,
} from "lucide-react";
import { getParameters } from "@/services/parameters";
import { ParametersFilters } from "./ParametersFilters";
import { CreateParameterModal } from "./CreateParameterModal";
import { EditParameterModal } from "./EditParameterModal";
import type { PaginatedParameters, ParameterType } from "@/types/parameter";

interface StationFilterOption {
  id: number;
  name: string;
}

interface ParametersTableProps {
  initialData: PaginatedParameters;
  activeCount: number;
  uniqueActiveCount: number;
}

const PAGE_SIZE = 5;

export function ParametersTable({
  initialData,
  activeCount,
  uniqueActiveCount,
}: ParametersTableProps) {
  const [data, setData] = useState<PaginatedParameters>(initialData);
  const [globalStatus, setGlobalStatus] = useState({
    activeCount,
    uniqueActiveCount,
  });
  const [search, setSearch] = useState("");
  const [stationFilter, setStationFilter] = useState("all");
  const [stations, setStations] = useState<StationFilterOption[]>([]);
  const [loading, setLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editParam, setEditParam] = useState<ParameterType | null>(null);

  const refreshGlobalStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/parameters?limit=all", {
        cache: "no-store",
      });

      if (!res.ok) return;

      const payload = await res.json();
      const rows = Array.isArray(payload?.data)
        ? (payload.data as ParameterType[])
        : [];

      const nextActiveCount = rows.reduce(
        (sum, parameter) => sum + (parameter.linked_stations?.length ?? 0),
        0,
      );
      const nextUniqueActiveCount = rows.filter(
        (parameter) => (parameter.linked_stations?.length ?? 0) > 0,
      ).length;

      setGlobalStatus({
        activeCount: nextActiveCount,
        uniqueActiveCount: nextUniqueActiveCount,
      });
    } catch {
      // Keep current values when the refresh request fails.
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/stations?limit=all", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const payload = await res.json();
        const rows = Array.isArray(payload?.data) ? payload.data : [];
        const mapped = Array.isArray(rows)
          ? rows
              .filter(
                (item): item is { id: number; name: string } =>
                  typeof item?.id === "number" &&
                  typeof item?.name === "string",
              )
              .map((item) => ({ id: item.id, name: item.name }))
              .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
          : [];
        setStations(mapped);
      } catch {
        setStations([]);
      }
    })();

    void refreshGlobalStatus();
  }, [refreshGlobalStatus]);

  const fetchPage = useCallback(
    async (page: number, query = search, selectedStation = stationFilter) => {
      setLoading(true);
      try {
        const result = await getParameters({
          page,
          limit: PAGE_SIZE,
          search: query,
          stationId: selectedStation,
        });
        setData(result);
      } finally {
        setLoading(false);
      }
    },
    [search, stationFilter],
  );

  function handleSearch(value: string) {
    setSearch(value);
    fetchPage(1, value, stationFilter);
  }

  function handleStationFilter(value: string) {
    setStationFilter(value);
    fetchPage(1, search, value);
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header da página */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Gerenciar Parâmetros
            </h1>
            <p className="text-sm text-secondary-text mt-0.5">
              Configure e monitore as variáveis de telemetria da rede IoT.
            </p>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors shrink-0"
          >
            <Plus size={16} />
            Novo Parâmetro
          </button>
        </div>

        <div className="rounded-xl border border-border bg-card-background px-5 py-4 max-w-3xl">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-secondary-text">
                Status Global
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-4xl leading-none font-bold text-primary">
                  {globalStatus.activeCount}
                </span>
                <span className="text-sm text-secondary-text">
                  Parâmetros Ativos
                </span>
                <span className="ml-3 flex items-baseline gap-2">
                  <span className="text-4xl leading-none font-bold text-primary">
                    {globalStatus.uniqueActiveCount}
                  </span>
                  <span className="text-sm text-secondary-text">
                    Parâmetros Únicos
                  </span>
                </span>
              </div>
            </div>

            <div className="hidden sm:flex items-end gap-3 h-10 pr-2">
              {[10, 18, 13, 22, 11, 26, 15, 20].map((h, idx) => (
                <span
                  key={idx}
                  className="w-1.5 rounded-full bg-primary/70"
                  style={{ height: `${h}px` }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Filtros */}
        <ParametersFilters
          search={search}
          stationFilter={stationFilter}
          stations={stations}
          onSearch={handleSearch}
          onStationFilter={handleStationFilter}
        />

        {/* Tabela */}
        <div className="bg-card-background border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-wider text-secondary-text">
                  <th className="text-left px-4 py-3 font-medium">
                    Nome do Parâmetro
                  </th>
                  <th className="text-left px-4 py-3 font-medium">Unidade</th>
                  <th className="text-left px-4 py-3 font-medium">Símbolo</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">
                    Fator de Valor
                  </th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">
                    Valor de Offset
                  </th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">
                    Nome JSON
                  </th>
                  <th className="text-left px-4 py-3 font-medium">
                    Estação Vinculada
                  </th>
                  <th className="text-right px-4 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  Array.from({ length: PAGE_SIZE }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 rounded bg-border animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : data.data.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center text-sm text-secondary-text"
                    >
                      Nenhum tipo de parâmetro encontrado.
                    </td>
                  </tr>
                ) : (
                  data.data.map((param) => (
                    <tr
                      key={param.id}
                      className="hover:bg-background/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-foreground">
                          {param.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-secondary-text">
                        {param.unit}
                      </td>
                      <td className="px-4 py-3 text-secondary-text">
                        {param.symbol}
                      </td>
                      <td className="px-4 py-3 text-secondary-text hidden sm:table-cell">
                        {param.factor_value}
                      </td>
                      <td className="px-4 py-3 text-secondary-text hidden md:table-cell">
                        {param.offset_value}
                      </td>
                      <td className="px-4 py-3 text-secondary-text hidden lg:table-cell">
                        {param.json_name}
                      </td>
                      <td className="px-4 py-3 text-secondary-text">
                        {param.linked_stations &&
                        param.linked_stations.length > 0
                          ? param.linked_stations
                              .map((station) => station.name)
                              .join(", ")
                          : "Sem vínculo"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEditParam(param)}
                            className="p-1.5 rounded-lg text-secondary-text hover:text-foreground hover:bg-background transition-colors"
                            title="Editar"
                          >
                            <Pencil size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer com paginação */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-border">
            <p className="text-[11px] text-secondary-text">
              {data.pagination.total === 0
                ? "Nenhum resultado"
                : `Exibindo ${(data.pagination.page - 1) * PAGE_SIZE + 1}–${Math.min(data.pagination.page * PAGE_SIZE, data.pagination.total)} de ${data.pagination.total} parâmetros`}
            </p>
            {data.pagination.totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => fetchPage(data.pagination.page - 1)}
                  disabled={data.pagination.page === 1 || loading}
                  className="px-3 py-1.5 text-xs rounded-lg border border-border text-secondary-text hover:bg-background disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                {Array.from(
                  { length: data.pagination.totalPages },
                  (_, i) => i + 1,
                ).map((n) => (
                  <button
                    key={n}
                    onClick={() => fetchPage(n)}
                    disabled={loading}
                    className={[
                      "w-7 h-7 text-xs rounded-lg font-semibold transition-colors",
                      n === data.pagination.page
                        ? "bg-primary text-white"
                        : "border border-border text-secondary-text hover:bg-background",
                    ].join(" ")}
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => fetchPage(data.pagination.page + 1)}
                  disabled={
                    data.pagination.page === data.pagination.totalPages ||
                    loading
                  }
                  className="px-3 py-1.5 text-xs rounded-lg border border-border text-secondary-text hover:bg-background disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border overflow-hidden bg-card-background/60">
          <div className="grid grid-cols-1 lg:grid-cols-3">
            <div className="lg:col-span-2 p-6 md:p-7">
              <div className="flex items-start gap-3">
                <Settings size={18} className="text-primary mt-1 shrink-0" />
                <div className="space-y-3">
                  <h3 className="text-2xl font-semibold text-foreground leading-tight">
                    Guia de Padronização
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <div className="text-sm text-secondary-text">
                      <span className="font-medium text-foreground">
                        Temperatura:
                      </span>{" "}
                      Graus Celsius (°C)
                    </div>
                    <div className="text-sm text-secondary-text">
                      <span className="font-medium text-foreground">
                        Pressão:
                      </span>{" "}
                      Hectopascal (hPa)
                    </div>
                    <div className="text-sm text-secondary-text">
                      <span className="font-medium text-foreground">
                        Umidade:
                      </span>{" "}
                      Percentagem (%)
                    </div>
                    <div className="text-sm text-secondary-text">
                      <span className="font-medium text-foreground">
                        Vento:
                      </span>{" "}
                      Metros por segundo (m/s)
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative min-h-[220px] lg:min-h-full">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBHHPNROATU5v92_XnypaiNy6x5mqtUXY_TZrJcegKvXB6c3jM_NTWk6LDfpUDHpWvthivs72fI2ID630RpyRAXt3Ok0d6YhubagmUFH4aMlguWN4k3-U3ePp1XCD5tcLW6tnjGYxOtht-3Krric641rEfyXm71pMyXJFphZyRuwsDn4mLpL6lwfvTBKvvzWYbNbpTnI540l_P9yLXFw62q2W7AW1laGPgIIfer-NAvuhBjwmKwPBeRzLZ5UUiyxEeJEXbKON2ovEA"
                alt="Painel de visualização"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-background/45" />
            </div>
          </div>
        </div>
      </div>

      {createOpen && (
        <CreateParameterModal
          onClose={() => setCreateOpen(false)}
          onSuccess={() => {
            void Promise.all([fetchPage(1), refreshGlobalStatus()]);
          }}
        />
      )}
      {editParam && (
        <EditParameterModal
          parameter={editParam}
          onClose={() => setEditParam(null)}
          onSuccess={() => {
            void Promise.all([
              fetchPage(data.pagination.page),
              refreshGlobalStatus(),
            ]);
          }}
        />
      )}
    </>
  );
}
