"use client";

import { useState, useEffect } from "react";
import { X, Plus, Pencil, Trash2, Check, AlertTriangle } from "lucide-react";
import type { GroupingWithStationDetails } from "@/types/grouping";
import {
  getGroupings,
  getGroupingById,
  createGrouping,
  updateGrouping,
  updateGroupingStations,
  deleteGrouping,
} from "@/services/groupings";
import { getStations } from "@/services/stations";

interface GroupManagerModalProps {
  onClose: () => void;
  onChanged: () => void;
}

type View = "list" | "create" | "edit" | "delete" | "stations";

export function GroupManagerModal({
  onClose,
  onChanged,
}: GroupManagerModalProps) {
  const [groups, setGroups] = useState<GroupingWithStationDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("list");
  const [selected, setSelected] = useState<GroupingWithStationDetails | null>(
    null,
  );
  const [allStations, setAllStations] = useState<
    { id: number; name: string }[]
  >([]);
  const [selectedStations, setSelectedStations] = useState<number[]>([]);
  const [loadingStations, setLoadingStations] = useState(false);
  const [stationSearch, setStationSearch] = useState("");

  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchGroups() {
    setLoading(true);
    try {
      const json = await getGroupings();
      setGroups(json ?? []);
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchGroups();
  }, []);

  async function handleCreate() {
    if (!name.trim()) return setError("Nome é obrigatório.");
    setSaving(true);
    setError(null);
    try {
      await createGrouping(name.trim());
      await fetchGroups();
      onChanged();
      setView("list");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar grupo.");
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit() {
    if (!name.trim()) return setError("Nome é obrigatório.");
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      await updateGrouping(selected.id, name.trim());
      await fetchGroups();
      onChanged();
      setView("list");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao editar grupo.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      await deleteGrouping(selected.id);
      await fetchGroups();
      onChanged();
      setView("list");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir grupo.");
    } finally {
      setSaving(false);
    }
  }

  async function openStations(g: GroupingWithStationDetails) {
    setSelected(g);
    setError(null);
    setLoadingStations(true);
    setStationSearch("");
    setView("stations");

    try {
      const [stationsResult, groupResult] = await Promise.all([
        getStations({ limit: "all" }),
        getGroupingById(g.id),
      ]);

      setAllStations(stationsResult.data ?? []);

      const currentIds: number[] = (
        groupResult.station_groupings ?? []
      ).flatMap((sg) => {
        const s = sg.stations;
        if (!s) return [];
        if (Array.isArray(s)) return (s as { id: number }[]).map((x) => x.id);
        return [(s as { id: number }).id];
      });

      setSelectedStations(currentIds);
    } catch {
      setAllStations([]);
      setSelectedStations([]);
    } finally {
      setLoadingStations(false);
    }
  }

  async function handleSaveStations() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      await updateGroupingStations(selected.id, selectedStations);
      onChanged();
      setView("list");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar estações.");
    } finally {
      setSaving(false);
    }
  }

  function openCreate() {
    setName("");
    setError(null);
    setView("create");
  }

  function openEdit(g: GroupingWithStationDetails) {
    setSelected(g);
    setName(g.name);
    setError(null);
    setView("edit");
  }

  function openDelete(g: GroupingWithStationDetails) {
    setSelected(g);
    setError(null);
    setView("delete");
  }

  function toggleStation(id: number) {
    setSelectedStations((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-card-background border border-border rounded-xl shadow-2xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            {view !== "list" && (
              <button
                onClick={() => {
                  setView("list");
                  setError(null);
                }}
                className="p-1 rounded-lg text-secondary-text hover:text-foreground hover:bg-background transition-colors"
              >
                {/* seta esquerda */}
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M9 11L5 7l4-4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            )}
            <h2 className="text-sm font-semibold text-foreground">
              {view === "list" && "Gerenciar Grupos"}
              {view === "create" && "Novo Grupo"}
              {view === "stations" && `Estações — ${selected?.name}`}
              {view === "edit" && "Editar Grupo"}
              {view === "delete" && "Excluir Grupo"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-secondary-text hover:text-foreground hover:bg-background transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* LIST */}
          {view === "list" && (
            <div className="space-y-2">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-10 rounded-lg bg-border animate-pulse"
                  />
                ))
              ) : groups.length === 0 ? (
                <p className="text-xs text-secondary-text text-center py-6">
                  Nenhum grupo cadastrado.
                </p>
              ) : (
                groups.map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-background border border-border"
                  >
                    <span className="text-sm text-foreground font-medium">
                      {g.name}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openStations(g)}
                        className="p-1.5 rounded-lg text-secondary-text hover:text-foreground hover:bg-card-background transition-colors"
                        title="Gerenciar estações"
                      >
                        {/* ícone de lista */}
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 13 13"
                          fill="none"
                        >
                          <path
                            d="M2 3.5h9M2 6.5h9M2 9.5h5"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => openEdit(g)}
                        className="p-1.5 rounded-lg text-secondary-text hover:text-foreground hover:bg-card-background transition-colors"
                        title="Editar"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => openDelete(g)}
                        className="p-1.5 rounded-lg text-secondary-text hover:text-alert hover:bg-alert/10 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {view === "stations" && (
            <div className="space-y-3">
              {error && (
                <p className="text-xs text-alert bg-alert/10 border border-alert/20 px-3 py-2 rounded-lg">
                  {error}
                </p>
              )}

              {/* Busca */}
              {!loadingStations && allStations.length > 0 && (
                <div className="relative">
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text"
                    width="13"
                    height="13"
                    viewBox="0 0 13 13"
                    fill="none"
                  >
                    <circle
                      cx="5.5"
                      cy="5.5"
                      r="4"
                      stroke="currentColor"
                      strokeWidth="1.4"
                    />
                    <path
                      d="M9 9l2.5 2.5"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                    />
                  </svg>
                  <input
                    type="text"
                    placeholder="Buscar estação..."
                    value={stationSearch}
                    onChange={(e) => setStationSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-lg bg-background border border-border text-xs text-foreground placeholder:text-secondary-text focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              )}

              {/* Lista */}
              <div className="space-y-2">
                {loadingStations ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-9 rounded-lg bg-border animate-pulse"
                    />
                  ))
                ) : allStations.length === 0 ? (
                  <p className="text-xs text-secondary-text text-center py-6">
                    Nenhuma estação cadastrada.
                  </p>
                ) : (
                  (() => {
                    const filtered = allStations.filter((s) =>
                      s.name
                        .toLowerCase()
                        .includes(stationSearch.toLowerCase()),
                    );
                    return filtered.length === 0 ? (
                      <p className="text-xs text-secondary-text text-center py-4">
                        Nenhuma estação encontrada.
                      </p>
                    ) : (
                      filtered.map((s) => {
                        const checked = selectedStations.includes(s.id);
                        return (
                          <button
                            key={s.id}
                            onClick={() => toggleStation(s.id)}
                            className={[
                              "w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-medium transition-colors text-left",
                              checked
                                ? "border-primary bg-primary/10 text-foreground"
                                : "border-border bg-background text-secondary-text hover:text-foreground",
                            ].join(" ")}
                          >
                            <span
                              className={[
                                "w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors",
                                checked
                                  ? "bg-primary border-primary"
                                  : "border-border",
                              ].join(" ")}
                            >
                              {checked && (
                                <svg
                                  width="8"
                                  height="8"
                                  viewBox="0 0 8 8"
                                  fill="none"
                                >
                                  <path
                                    d="M1 4l2 2 4-4"
                                    stroke="white"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              )}
                            </span>
                            {s.name}
                          </button>
                        );
                      })
                    );
                  })()
                )}
              </div>
            </div>
          )}

          {/* CREATE / EDIT */}
          {(view === "create" || view === "edit") && (
            <div className="space-y-4">
              {error && (
                <p className="text-xs text-alert bg-alert/10 border border-alert/20 px-3 py-2 rounded-lg">
                  {error}
                </p>
              )}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-secondary-text">
                  Nome do Grupo
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Litoral Norte"
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-secondary-text focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>
          )}

          {/* DELETE */}
          {view === "delete" && selected && (
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-full bg-alert/15 flex items-center justify-center text-alert shrink-0">
                  <AlertTriangle size={16} />
                </div>
                <div>
                  <p className="text-sm text-foreground font-medium">
                    Excluir &quot;{selected.name}&quot;?
                  </p>
                  <p className="text-xs text-secondary-text mt-1">
                    As estações vinculadas não serão excluídas, apenas
                    desassociadas deste grupo.
                  </p>
                </div>
              </div>
              {error && (
                <p className="text-xs text-alert bg-alert/10 border border-alert/20 px-3 py-2 rounded-lg">
                  {error}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border shrink-0">
          {view === "list" ? (
            <>
              <span className="text-[11px] text-secondary-text">
                {groups.length} grupo{groups.length !== 1 ? "s" : ""}
              </span>
              <button
                onClick={openCreate}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
              >
                <Plus size={14} />
                Novo Grupo
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setView("list");
                  setError(null);
                }}
                className="px-4 py-2 text-sm text-secondary-text hover:text-foreground transition-colors"
              >
                Cancelar
              </button>
              {view === "create" && (
                <button
                  onClick={handleCreate}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {saving ? (
                    "Salvando..."
                  ) : (
                    <>
                      <Check size={14} /> Criar
                    </>
                  )}
                </button>
              )}
              {view === "stations" && (
                <button
                  onClick={handleSaveStations}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {saving ? (
                    "Salvando..."
                  ) : (
                    <>
                      <Check size={14} /> Salvar
                    </>
                  )}
                </button>
              )}
              {view === "edit" && (
                <button
                  onClick={handleEdit}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {saving ? (
                    "Salvando..."
                  ) : (
                    <>
                      <Check size={14} /> Salvar
                    </>
                  )}
                </button>
              )}
              {view === "delete" && (
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-alert text-white hover:bg-alert/90 disabled:opacity-50 transition-colors"
                >
                  {saving ? (
                    "Excluindo..."
                  ) : (
                    <>
                      <Trash2 size={14} /> Excluir
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
