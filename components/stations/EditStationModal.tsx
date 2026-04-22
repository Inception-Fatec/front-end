"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { ParameterIcon } from "@/components/alerts/ParameterIcon";
import type { UserRole } from "@/types/user";
import type { StationWithParameters } from "@/types/station";
import type { ParameterType } from "@/types/parameter";

interface EditStationModalProps {
  station: StationWithParameters;
  sessionRole: UserRole;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditStationModal({
  station,
  sessionRole,
  onClose,
  onSuccess,
}: EditStationModalProps) {
  const [name, setName] = useState(station.name);
  const [idDatalogger, setIdDatalogger] = useState(station.id_datalogger);
  const [address, setAddress] = useState(station.address ?? "");
  const [latitude, setLatitude] = useState(String(station.latitude ?? ""));
  const [longitude, setLongitude] = useState(String(station.longitude ?? ""));
  const [stationStatus, setStationStatus] = useState(station.status);
  const [selectedParameters, setSelectedParameters] = useState<number[]>(
    station.parameters.map((p) => p.id_parameter_type),
  );
  const [parameterTypes, setParameterTypes] = useState<ParameterType[]>([]);
  const [loadingParams, setLoadingParams] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchParameterTypes() {
      try {
        const res = await fetch("/api/parameter-types?limit=all");
        if (!res.ok) throw new Error();
        const json = await res.json();
        setParameterTypes(json.data ?? []);
      } catch {
        setParameterTypes([]);
      } finally {
        setLoadingParams(false);
      }
    }
    fetchParameterTypes();
  }, []);

  function toggleParameter(id: number) {
    setSelectedParameters((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }

  async function handleSubmit() {
    setError(null);

    if (!name.trim()) return setError("Nome não pode ser vazio.");
    if (!idDatalogger.trim())
      return setError("ID do datalogger não pode ser vazio.");
    if (latitude && isNaN(Number(latitude)))
      return setError("Latitude inválida.");
    if (longitude && isNaN(Number(longitude)))
      return setError("Longitude inválida.");

    setLoading(true);
    try {
      const res = await fetch("/api/stations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: station.id,
          name: name.trim(),
          id_datalogger: idDatalogger.trim(),
          address: address.trim() || null,
          latitude: latitude ? Number(latitude) : null,
          longitude: longitude ? Number(longitude) : null,
          status: stationStatus,
          parameters: selectedParameters,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erro ao atualizar estação.");
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao atualizar estação.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-card-background border border-border rounded-xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-sm font-semibold text-foreground">
            Editar Estação
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-secondary-text hover:text-foreground hover:bg-background transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 overflow-y-auto">
          {error && (
            <p className="text-xs text-alert bg-alert/10 border border-alert/20 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-secondary-text">
              Nome da Estação
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {sessionRole === "ADMIN" && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-secondary-text">
                ID do Datalogger
              </label>
              <input
                value={idDatalogger}
                onChange={(e) => setIdDatalogger(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
              />
              <p className="text-[11px] text-secondary-text">
                Identificador único do dispositivo físico de coleta
              </p>
            </div>
          )}

          {sessionRole === "ADMIN" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-secondary-text">
                  Latitude
                </label>
                <input
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder="-23.5505"
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-secondary-text focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-secondary-text">
                  Longitude
                </label>
                <input
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder="-46.6333"
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-secondary-text focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>
          )}

          {sessionRole === "ADMIN" && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-secondary-text">
                Localização (cidade/região)
              </label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ex: São Paulo, SP"
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-secondary-text focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          )}

          {sessionRole === "ADMIN" && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-secondary-text">
                Sensores disponíveis
              </label>
              {loadingParams ? (
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-8 rounded-lg bg-border animate-pulse"
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {parameterTypes.map((pt) => {
                    const checked = selectedParameters.includes(pt.id);
                    return (
                      <button
                        key={pt.id}
                        onClick={() => toggleParameter(pt.id)}
                        className={[
                          "flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors text-left",
                          checked
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border bg-background text-secondary-text hover:border-border/80 hover:text-foreground",
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
                        <ParameterIcon name={pt.name} size={13} />
                        <span className="truncate">{pt.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Toggle status */}
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-xs font-medium text-foreground">
                Estação ativa
              </p>
              <p className="text-[11px] text-secondary-text">
                Permite o recebimento de novos dados via IoT
              </p>
            </div>
            <button
              onClick={() => setStationStatus((v) => !v)}
              className={[
                "relative w-10 h-6 rounded-full transition-colors shrink-0",
                stationStatus ? "bg-primary" : "bg-border",
              ].join(" ")}
            >
              <span
                className={[
                  "absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform",
                  stationStatus ? "translate-x-4" : "translate-x-0",
                ].join(" ")}
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border shrink-0">
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
            {loading ? "Salvando..." : "Salvar Alterações"}
          </button>
        </div>
      </div>
    </div>
  );
}
