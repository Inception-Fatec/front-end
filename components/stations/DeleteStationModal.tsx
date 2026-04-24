"use client";

import { useState } from "react";
import { X, AlertTriangle } from "lucide-react";
import { deleteStation } from "@/services/stations";
import type { StationWithParameters } from "@/types/station";

interface DeleteStationModalProps {
  station: StationWithParameters;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteStationModal({
  station,
  onClose,
  onSuccess,
}: DeleteStationModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    setLoading(true);
    try {
      await deleteStation(station.id);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao deletar estação.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-card-background border border-border rounded-xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">
            Confirmar exclusão
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-secondary-text hover:text-foreground hover:bg-background transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="flex gap-3">
            <div className="w-9 h-9 rounded-full bg-alert/15 flex items-center justify-center text-alert shrink-0">
              <AlertTriangle size={16} />
            </div>
            <div>
              <p className="text-sm text-foreground font-medium">
                Excluir {station.name}?
              </p>
              <p className="text-xs text-secondary-text mt-1">
                Esta ação não pode ser desfeita. Todos os parâmetros e dados
                associados serão removidos permanentemente.
              </p>
            </div>
          </div>

          {error && (
            <p className="text-xs text-alert bg-alert/10 border border-alert/20 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-secondary-text hover:text-foreground transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-alert text-white hover:bg-alert/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Excluindo..." : "Excluir"}
          </button>
        </div>
      </div>
    </div>
  );
}
