"use client";

import { useState, useCallback } from "react";
import { Pencil, Trash2, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { CreateStationModal } from "./CreateStationModal";
import { EditStationModal } from "./EditStationModal";
import { DeleteStationModal } from "./DeleteStationModal";
import { StationDrawer } from "./StationsDrawer";
import { ParameterIcon } from "@/components/alerts/ParameterIcon";
import { getStations } from "@/services/stations";
import type { PaginatedStations, StationWithParameters } from "@/types/station";
import type { UserRole } from "@/types/user";

interface StationsTableProps {
  initialData: PaginatedStations;
  sessionRole: UserRole;
}

function StatusBadge({ status }: { status: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium ${status ? "text-green-400" : "text-secondary-text"}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${status ? "bg-green-400" : "bg-secondary-text"}`}
      />
      {status ? "Ativa" : "Inativa"}
    </span>
  );
}

function SensorIcons({
  parameters,
}: {
  parameters: StationWithParameters["parameters"];
}) {
  if (!parameters || parameters.length === 0) {
    return <span className="text-xs text-secondary-text">—</span>;
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {parameters.map((p) => (
        <span
          key={p.id}
          title={`${p.parameter_types.name} (${p.parameter_types.unit})`}
        >
          <ParameterIcon name={p.parameter_types.name} size={15} />
        </span>
      ))}
    </div>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function StationsTable({ initialData, sessionRole }: StationsTableProps) {
  const [data, setData] = useState<PaginatedStations>(initialData);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editStation, setEditStation] = useState<StationWithParameters | null>(null);
  const [deleteStation, setDeleteStation] = useState<StationWithParameters | null>(null);
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);

  const fetchPage = useCallback(
    async (page: number, s = search) => {
      setLoading(true);
      try {
        const result = await getStations({ page, search: s });
        setData(result);
      } finally {
        setLoading(false);
      }
    },
    [search],
  );

  function handleSearch(value: string) {
    setSearch(value);
    fetchPage(1, value);
  }

  const canCreate = sessionRole === "ADMIN";
  const canEdit = sessionRole !== "USER";
  const canDelete = sessionRole === "ADMIN";

  const { page, total, totalPages } = data.pagination;

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Gerenciar Estações
            </h1>
            <p className="text-sm text-secondary-text mt-0.5">
              Visualize, cadastre e gerencie as estações meteorológicas conectadas.
            </p>
          </div>
          {canCreate && (
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors shrink-0"
            >
              <Plus size={16} />
              Nova Estação
            </button>
          )}
        </div>

        {/* Busca e filtros */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text"
              width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Buscar estação..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-card-background border border-border text-sm text-foreground placeholder:text-secondary-text focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <select
            className="px-3 py-2 rounded-lg bg-card-background border border-border text-sm text-secondary-text focus:outline-none focus:border-primary transition-colors cursor-pointer"
          >
            <option value="all">Status</option>
            <option value="active">Ativa</option>
            <option value="inactive">Inativa</option>
          </select>

          <select
            className="px-3 py-2 rounded-lg bg-card-background border border-border text-sm text-secondary-text focus:outline-none focus:border-primary transition-colors cursor-pointer"
          >
            <option value="all">Grupo</option>
          </select>
        </div>

        {/* Tabela */}
        <div className="bg-card-background border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-wider text-secondary-text">
                  <th className="text-left px-4 py-3 font-medium">Nome da Estação</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">ID do Datalogger</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Localização</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Sensores</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Última Transmissão</th>
                  <th className="text-right px-4 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 rounded bg-border animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : data.data.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-secondary-text">
                      Nenhuma estação encontrada.
                    </td>
                  </tr>
                ) : (
                  data.data.map((station) => (
                    <tr
                      key={station.id}
                      className="hover:bg-background/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedStationId(station.id)}
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-foreground">{station.name}</span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="font-mono text-xs text-primary bg-primary/10 px-2 py-0.5 rounded">
                          {station.id_datalogger}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-secondary-text hidden md:table-cell">
                        {station.address ?? "—"}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <SensorIcons parameters={station.parameters} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={station.status} />
                      </td>
                      <td className="px-4 py-3 text-secondary-text text-xs hidden lg:table-cell">
                        {formatDate(station.last_measurement)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {canEdit && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditStation(station); }}
                              className="p-1.5 rounded-lg text-secondary-text hover:text-foreground hover:bg-background transition-colors"
                              title="Editar"
                            >
                              <Pencil size={14} />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteStation(station); }}
                              className="p-1.5 rounded-lg text-secondary-text hover:text-danger hover:bg-danger-dim transition-colors"
                              title="Excluir"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer paginação */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-border">
            <p className="text-[11px] text-secondary-text">
              {total === 0
                ? "Nenhum resultado"
                : `Exibindo ${(page - 1) * 8 + 1}–${Math.min(page * 8, total)} de ${total} estações`}
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => fetchPage(page - 1)}
                  disabled={page === 1 || loading}
                  className="px-3 py-1.5 text-xs rounded-lg border border-border text-secondary-text hover:bg-background disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => fetchPage(n)}
                    disabled={loading}
                    className={[
                      "w-7 h-7 text-xs rounded-lg font-semibold transition-colors",
                      n === page
                        ? "bg-primary text-white"
                        : "border border-border text-secondary-text hover:bg-background",
                    ].join(" ")}
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => fetchPage(page + 1)}
                  disabled={page === totalPages || loading}
                  className="px-3 py-1.5 text-xs rounded-lg border border-border text-secondary-text hover:bg-background disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {createOpen && (
        <CreateStationModal
          sessionRole={sessionRole}
          onClose={() => setCreateOpen(false)}
          onSuccess={() => fetchPage(1)}
        />
      )}
      {editStation && (
        <EditStationModal
          station={editStation}
          sessionRole={sessionRole}
          onClose={() => setEditStation(null)}
          onSuccess={() => fetchPage(page)}
        />
      )}
      {deleteStation && (
        <DeleteStationModal
          station={deleteStation}
          onClose={() => setDeleteStation(null)}
          onSuccess={() => fetchPage(page)}
        />
      )}
      {selectedStationId && (
        <StationDrawer
          stationId={selectedStationId}
          sessionRole={sessionRole}
          onClose={() => setSelectedStationId(null)}
          onEdit={() => {
            const s = data.data.find((s) => s.id === selectedStationId) ?? null;
            setEditStation(s);
            setSelectedStationId(null);
          }}
          onDelete={() => {
            const s = data.data.find((s) => s.id === selectedStationId) ?? null;
            setDeleteStation(s);
            setSelectedStationId(null);
          }}
        />
      )}
    </>
  );
}