"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { ParameterType } from "@/types/parameter";
import { StationsMultiSelect } from "./StationsMultiSelect";

interface EditParameterModalProps {
  parameter: ParameterType;
  onClose: () => void;
  onSuccess: () => void;
}

interface StationOption {
  id: number;
  name: string;
}

export function EditParameterModal({
  parameter,
  onClose,
  onSuccess,
}: EditParameterModalProps) {
  const [name, setName] = useState(parameter.name);
  const [unit, setUnit] = useState(parameter.unit);
  const [symbol, setSymbol] = useState(parameter.symbol);
  const [factorValue, setFactorValue] = useState(parameter.factor_value);
  const [offsetValue, setOffsetValue] = useState(parameter.offset_value);
  const [jsonName, setJsonName] = useState(parameter.json_name ?? "");
  const [selectedStationIds, setSelectedStationIds] = useState<number[]>([]);
  const [stations, setStations] = useState<StationOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const [stationsRes, parameterRes] = await Promise.all([
          fetch("/api/stations?limit=all", { cache: "no-store" }),
          fetch(`/api/parameters?id=${parameter.id}`, { cache: "no-store" }),
        ]);

        if (!stationsRes.ok || !parameterRes.ok) return;

        const stationsPayload = await stationsRes.json();
        const parameterData = await parameterRes.json();

        const stationRows = Array.isArray(stationsPayload?.data)
          ? stationsPayload.data
          : [];

        const mappedStations = Array.isArray(stationRows)
          ? stationRows
              .filter(
                (item): item is { id: number; name: string } =>
                  typeof item?.id === "number" &&
                  typeof item?.name === "string",
              )
              .map((item) => ({ id: item.id, name: item.name }))
              .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
          : [];

        if (cancelled) return;

        setStations(mappedStations);

        if (Array.isArray(parameterData?.currentStationIds)) {
          setSelectedStationIds(
            parameterData.currentStationIds.filter(
              (value: unknown): value is number =>
                typeof value === "number" && Number.isFinite(value),
            ),
          );
        } else if (typeof parameterData?.currentStationId === "number") {
          setSelectedStationIds([parameterData.currentStationId]);
        } else {
          setSelectedStationIds([]);
        }
      } catch {
        if (!cancelled) {
          setStations([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [parameter.id]);

  async function handleSubmit() {
    setError(null);

    if (!name.trim() || !unit.trim() || !symbol.trim()) {
      return setError(
        "Preencha os campos obrigatórios (Nome, Unidade, Símbolo).",
      );
    }

    if (selectedStationIds.length === 0) {
      return setError("Selecione ao menos uma estação vinculada.");
    }

    setLoading(true);
    try {
      const res = await fetch("/api/parameters", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: parameter.id,
          name: name.trim(),
          unit: unit.trim(),
          symbol: symbol.trim(),
          factor_value: factorValue,
          offset_value: offsetValue,
          json_name: jsonName.trim() || null,
          stationIds: selectedStationIds,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Erro ao atualizar parâmetro");
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao atualizar parâmetro",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-card-background border border-border rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">
            Editar Parâmetro
          </h2>
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
            <label className="text-xs font-medium text-secondary-text">
              Nome do Parâmetro *
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Temperatura do Solo"
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-secondary-text focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-secondary-text">
                Unidade *
              </label>
              <input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="Ex: Graus Celsius"
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-secondary-text focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-secondary-text">
                Símbolo *
              </label>
              <input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="Ex: °C"
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-secondary-text focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-secondary-text">
                Fator de Valor
              </label>
              <input
                type="number"
                value={factorValue}
                onChange={(e) => setFactorValue(e.target.valueAsNumber || 1)}
                step="0.01"
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-secondary-text">
                Valor de Offset
              </label>
              <input
                type="number"
                value={offsetValue}
                onChange={(e) => setOffsetValue(e.target.valueAsNumber || 0)}
                step="0.01"
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-secondary-text">
              Nome JSON
            </label>
            <input
              value={jsonName}
              onChange={(e) => setJsonName(e.target.value)}
              placeholder="Ex: soil_temperature"
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-secondary-text focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <StationsMultiSelect
            label="Estações Vinculadas *"
            options={stations}
            selectedIds={selectedStationIds}
            onChange={setSelectedStationIds}
            placeholder="Selecione uma ou mais estações"
          />
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
