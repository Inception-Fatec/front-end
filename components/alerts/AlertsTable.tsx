"use client";

import { useState, useCallback, useEffect } from "react";
import { Pencil, Trash2, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { SeverityBadge } from "./SeverityBadge";
import { ParameterIcon } from "./ParameterIcon";
import { CreateAlertModal } from "./CreateAlertModal";
import { EditAlertModal } from "./EditAlertModal";
import { DeleteAlertModal } from "./DeleteAlertModal";
import { AlertFilters } from "./AlertFilters";
import type { AlertWithParameters, PaginatedAlerts } from "@/types/alert";
import type { ParameterType } from "@/types/parameter";
import { UserRole } from "@/types/api";
import { getAlerts, updateAlertStatus } from "@/services/alerts";
import { getParameters } from "@/services/parameters";
import { getStations } from "@/services/stations";
import { StationWithParameters } from "@/types/station";

interface AlertsTableProps {
  sessionRole: UserRole;
}

export function AlertsTable({ sessionRole }: AlertsTableProps) {
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(8);
  const [parameterTypeFilter, setParameterTypeFilter] = useState(0);
  const [parameterTypes, setParameterTypes] = useState<ParameterType[]>([]);
  const [severityFilter, setSeverityFilter] = useState("");
  const [stations, setStations] = useState<StationWithParameters[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editAlert, setEditAlert] = useState<AlertWithParameters | null>(null);
  const [deleteAlert, setDeleteAlert] = useState<AlertWithParameters | null>(
    null,
  );
  const [data, setData] = useState<PaginatedAlerts>({
    data: [],
    pagination: {
      page: 1,
      limit: limit,
      totalPages: 1,
      total: 0,
    },
  });

  const fetchPage = useCallback(
    async (
      page: number,
      l = limit,
      s = search,
      p = parameterTypeFilter,
      se = severityFilter,
    ) => {
      setLoading(true);
      try {
        const result = await getAlerts({
          page,
          limit: l,
          search: s,
          parameterType: p,
          severity: se,
        });
        setData(result);
      } finally {
        setLoading(false);
      }
    },
    [limit, search, parameterTypeFilter, severityFilter],
  );

  const fetchParameterTypes = useCallback(async () => {
    try {
      const result = await getParameters({
        page: 1,
        limit: "all" as const,
        search: "",
      });
      setParameterTypes(result.data);
    } catch (error) {
      console.error("Erro ao buscar tipos de parâmetro:", error);
      setParameterTypes([]);
    }
  }, []);

  const fetchStations = useCallback(async () => {
    try {
      const result = await getStations({
        page: 1,
        limit: "all" as const,
        search: "",
      });
      setStations(result.data);
    } catch (error) {
      console.error("Erro ao buscar estações:", error);
      setStations([]);
    }
  }, []);

  const toggleStatus = async (id: number, status: boolean) => {
    try {
      await updateAlertStatus(id, status);
      setData((prev) => ({
        ...prev,
        data: prev.data.map((alert) =>
          alert.id === id ? { ...alert, status } : alert,
        ),
      }));
    } catch (error) {
      console.error("Erro ao atualizar status do alerta:", error);
    }
  };

  useEffect(() => {
    fetchPage(1);
    fetchParameterTypes();
    fetchStations();
  }, [fetchPage, fetchParameterTypes]);

  function handleSearch(value: string) {
    setSearch(value);
    fetchPage(1, limit, value, parameterTypeFilter, severityFilter);
  }

  function handleParameterTypeFilter(value: number) {
    setParameterTypeFilter(value);
    fetchPage(1, limit, search, value, severityFilter);
  }

  function handleSeverityFilter(value: string) {
    setSeverityFilter(value);
    fetchPage(1, limit, search, parameterTypeFilter, value);
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("pt-BR");
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header da página */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          {sessionRole !== "USER" && (
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors shrink-0"
            >
              <Plus size={16} />
              Novo Alerta
            </button>
          )}
        </div>

        {/* Filtros */}
        <AlertFilters
          search={search}
          parameterTypeFilter={parameterTypeFilter}
          parameterTypes={parameterTypes}
          severityFilter={severityFilter}
          onSeverityFilter={handleSeverityFilter}
          onSearch={handleSearch}
          onParameterTypeFilter={handleParameterTypeFilter}
        />

        {/* Tabela */}
        <div className="bg-card-background border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-wider text-secondary-text">
                  <th className="text-left px-4 py-3 font-medium">
                    Nome do Alerta
                  </th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">
                    Tipo de Parâmetro
                  </th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">
                    Mensagem
                  </th>
                  <th className="text-left px-4 py-3 font-medium">Condição</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">
                    Severidade
                  </th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">
                    Cadastrado em
                  </th>
                  {sessionRole !== "USER" && (
                    <>
                      <th className="text-right px-4 py-3 font-medium">
                        Status
                      </th>
                      <th className="text-right px-4 py-3 font-medium">
                        Ações
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 rounded bg-border animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : data.data.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-sm text-secondary-text"
                    >
                      Nenhum alerta encontrado.
                    </td>
                  </tr>
                ) : (
                  data.data.map((alert) => {
                    return (
                      <tr
                        key={alert.id}
                        className="hover:bg-background/50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-foreground">
                              {alert.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-secondary-text hidden sm:table-cell">
                          <div className="flex items-center gap-2">
                            <ParameterIcon
                              name={
                                alert.alert_parameters?.[0]?.parameters
                                  ?.parameter_types?.name || "Parâmetro"
                              }
                            />
                            <div>
                              {
                                alert.alert_parameters?.[0]?.parameters
                                  ?.parameter_types?.name
                              }
                              <br />
                              <span className="text-xs text-secondary-text">
                                {
                                  alert.alert_parameters?.[0]?.parameters
                                    ?.parameter_types?.unit
                                }{" "}
                                -{" "}
                                {
                                  alert.alert_parameters?.[0]?.parameters
                                    ?.parameter_types?.symbol
                                }
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          {alert.message}
                        </td>
                        <td className="px-4 py-3">
                          {alert.operator} {alert.value}
                          {
                            alert.alert_parameters?.[0]?.parameters
                              ?.parameter_types?.symbol
                          }
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <SeverityBadge severity={alert.severity} />
                        </td>
                        <td className="px-4 py-3 text-secondary-text text-xs hidden lg:table-cell">
                          {formatDate(alert.created_at)}
                        </td>
                        {sessionRole !== "USER" && (
                          <>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-between">
                                <button
                                  onClick={() =>
                                    toggleStatus(alert.id, !alert.status)
                                  }
                                  className={[
                                    "relative w-10 h-5.5 rounded-full transition-colors duration-200",
                                    alert.status ? "bg-primary" : "bg-border",
                                  ].join(" ")}
                                  style={{ height: "22px", width: "40px" }}
                                >
                                  <span
                                    className={[
                                      "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200",
                                      alert.status
                                        ? "translate-x-min"
                                        : "-translate-x-full",
                                    ].join(" ")}
                                  />
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => setEditAlert(alert)}
                                  className="p-1.5 rounded-lg text-secondary-text hover:text-foreground hover:bg-background transition-colors"
                                  title="Editar"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  onClick={() => setDeleteAlert(alert)}
                                  className="p-1.5 rounded-lg text-secondary-text hover:text-danger hover:bg-danger-dim transition-colors"
                                  title="Excluir"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer com paginação */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-border">
            <p className="text-[11px] text-secondary-text">
              {data.pagination.total === 0
                ? "Nenhum resultado"
                : `Exibindo ${(data.pagination.page - 1) * 8 + 1}–${Math.min(data.pagination.page * 8, data.pagination.total)} de ${data.pagination.total} alertas`}
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
      </div>

      {createOpen && (
        <CreateAlertModal
          parameterTypes={parameterTypes}
          stations={stations}
          onClose={() => setCreateOpen(false)}
          onSuccess={() => fetchPage(1)}
        />
      )}
      {editAlert && (
        <EditAlertModal
          alert={editAlert}
          parameterTypes={parameterTypes}
          stations={stations}
          onClose={() => setEditAlert(null)}
          onSuccess={() => fetchPage(data.pagination.page)}
        />
      )}
      {deleteAlert && (
        <DeleteAlertModal
          alert={deleteAlert}
          onClose={() => setDeleteAlert(null)}
          onSuccess={() => fetchPage(data.pagination.page)}
        />
      )}
    </>
  );
}
