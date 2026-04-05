"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { createAlert } from "@/services/alerts";
import { AlertSeverity, AlertOperator } from "@/types/alert";
import { ParameterType } from "@/types/parameter";
import { StationWithParameters } from "@/types/station";

interface CreateAlertModalProps {
  parameterTypes: ParameterType[];
  stations: StationWithParameters[];
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateAlertModal({
  parameterTypes,
  stations,
  onClose,
  onSuccess,
}: CreateAlertModalProps) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState<AlertSeverity | "">("");
  const [operator, setOperator] = useState<AlertOperator | "">("");
  const [value, setValue] = useState(0);
  const [parameterType, setParameterType] = useState<ParameterType | null>(null);
  const [parameters, setParameters] = useState<number[]>([]);
  const [selectedStationIds, setSelectedStationIds] = useState<Set<number>>(new Set());
  const [validStations, setValidStations] = useState<StationWithParameters[]>([]);
  const [stationSearch, setStationSearch] = useState("");
  const [showStationDropdown, setShowStationDropdown] = useState(false);
  const [status, setStatus] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const SEVERITY_LABELS: Record<AlertSeverity, string> = {
    CRITICAL: "Crítico",
    MODERATE: "Moderado",
    MINOR: "Simples",
  };

  const OPERATOR_LABELS: Record<AlertOperator, string> = {
    "<": "Menor que",
    "<=": "Menor ou igual a",
    ">": "Maior que",
    ">=": "Maior ou igual a",
    "=": "Igual a",
  };

  const handleParameterTypeChange = (parameterTypeId: number) => {
    const selected = parameterTypes.find((t) => t.id === parameterTypeId) ?? null;
    setParameterType(selected);
    setSelectedStationIds(new Set());
    setParameters([]);
    setStationSearch("");

    if (selected) {
      const valid = stations.filter((station) =>
        station.parameters.some((p) => p.id_parameter_type === parameterTypeId)
      );
      setValidStations(valid);
    } else {
      setValidStations([]);
    }
  };

  const handleStationChange = (stationId: number) => {
    setSelectedStationIds((prev) => {
      const next = new Set(prev);
      if (next.has(stationId)) {
        next.delete(stationId);
      } else {
        next.add(stationId);
      }

      const allParams: number[] = [];
      for (const id of next) {
        const station = stations.find((s) => s.id === id);
        if (station && parameterType) {
          station.parameters
            .filter((p) => p.id_parameter_type === parameterType.id)
            .forEach((p) => allParams.push(p.id));
        }
      }
      setParameters(allParams);

      return next;
    });
  };

  async function handleSubmit() {
    setError(null);

    if (!name.trim() || !message.trim() || !severity || !operator) {
      return setError("Preencha todos os campos.");
    }

    setLoading(true);
    try {
      await createAlert({ name, message, severity, operator, value, status, parameters });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar alerta.");
    } finally {
      setLoading(false);
    }
  }

  const filteredStations = validStations.filter((s) =>
    s.name.toLowerCase().includes(stationSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-card-background border border-border rounded-xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Novo Alerta</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-secondary-text hover:text-foreground hover:bg-background transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <p className="text-xs text-alert bg-alert/10 border border-alert/20 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-secondary-text">Nome do Alerta</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Temperatura Crítica"
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-secondary-text focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-secondary-text">Mensagem</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ex: A temperatura ultrapassou o limite crítico!"
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-secondary-text focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-secondary-text">Parâmetro</label>
            <select
              value={parameterType?.id ?? ""}
              onChange={(e) => handleParameterTypeChange(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
            >
              <option value="">Selecionar parâmetro</option>
              {parameterTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.unit} - {type.symbol}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-secondary-text">Estações</label>

            <div className="relative">
              <input
                type="text"
                value={stationSearch}
                onChange={(e) => {
                  setStationSearch(e.target.value);
                  setShowStationDropdown(true);
                }}
                onFocus={() => setShowStationDropdown(true)}
                onBlur={() => setTimeout(() => setShowStationDropdown(false), 150)}
                placeholder="Buscar estação..."
                disabled={!parameterType}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-secondary-text focus:outline-none focus:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              />

              {showStationDropdown && filteredStations.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-card-background shadow-lg max-h-40 overflow-y-auto">
                  {filteredStations.map((station) => (
                    <li
                      key={station.id}
                      onMouseDown={() => {
                        handleStationChange(station.id);
                        setStationSearch("");
                      }}
                      className="flex items-center justify-between px-3 py-2 text-sm cursor-pointer hover:bg-background transition-colors"
                    >
                      <span
                        className={
                          selectedStationIds.has(station.id)
                            ? "text-primary font-medium"
                            : "text-foreground"
                        }
                      >
                        {station.name}
                      </span>
                      {selectedStationIds.has(station.id) && (
                        <span className="text-xs text-primary">✓</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {selectedStationIds.size > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {Array.from(selectedStationIds).map((id) => {
                  const station = stations.find((s) => s.id === id);
                  return station ? (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 border border-primary/20 text-xs text-primary"
                    >
                      {station.name}
                      <button
                        type="button"
                        onMouseDown={() => handleStationChange(id)}
                        className="hover:text-primary/60 transition-colors"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ) : null;
                })}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-secondary-text">Severidade</label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as AlertSeverity)}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
            >
              <option value="">Selecionar severidade</option>
              {Object.entries(SEVERITY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-row gap-4 max-[500px]:flex-col">
            <div className="space-y-1.5 w-1/2 max-[500px]:w-full">
              <label className="text-xs font-medium text-secondary-text">Condição</label>
              <select
                value={operator}
                onChange={(e) => setOperator(e.target.value as AlertOperator)}
                className="h-9 w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
              >
                <option value="">Selecionar condição</option>
                {Object.entries(OPERATOR_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5 w-1/2 max-[500px]:w-full">
              <label className="text-xs font-medium text-secondary-text">Valor</label>
              <div className="h-9 flex rounded-lg border border-border bg-background focus-within:border-primary transition-colors overflow-hidden">
                <input
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.valueAsNumber || 0)}
                  placeholder="Ex: 30"
                  className="flex-1 min-w-0 px-3 bg-transparent text-sm text-foreground placeholder:text-secondary-text focus:outline-none"
                />
                <input
                  readOnly
                  tabIndex={-1}
                  value={parameterType?.symbol ?? ""}
                  className="w-14 shrink-0 px-2 bg-background border-l border-border text-sm text-secondary-text text-center focus:outline-none cursor-default"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 px-6 py-4 border-t border-border">
          <div>
            <p className="text-xs font-medium text-secondary-text">
              Alerta ativo
            </p>
            <p className="text-[11px] text-secondary-text/60 mt-0.5">
              O alerta {status ? "" : "não"} enviará notificações
            </p>
          </div>
          <button
            onClick={() => setStatus((v) => !v)}
            className={[
              "relative w-10 h-5.5 rounded-full transition-colors duration-200",
              status ? "bg-primary" : "bg-border",
            ].join(" ")}
            style={{ height: "22px", width: "40px" }}
          >
            <span
              className={[
                "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200",
                status ? "translate-x-min" : "-translate-x-full",
              ].join(" ")}
            />
          </button>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-secondary-text hover:text-foreground transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}