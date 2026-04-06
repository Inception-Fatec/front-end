"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { updateUser } from "@/services/users";
import type { User, UserRole } from "@/types/user";

interface EditUserModalProps {
  user: User;
  allowedRoles: UserRole[];
  onClose: () => void;
  onSuccess: () => void;
}

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrador",
  OPERATOR: "Operador",
  USER: "Usuário",
};

export function EditUserModal({
  user,
  allowedRoles,
  onClose,
  onSuccess,
}: EditUserModalProps) {
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState<UserRole>(user.role);
  const [status, setStatus] = useState(user.status);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    if (!name.trim()) return setError("Nome não pode ser vazio.");

    setLoading(true);
    try {
      await updateUser(user.id, { name, role, status });
      onSuccess();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao atualizar usuário.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-card-background border border-border rounded-xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">
            Editar Usuário
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
              Nome completo
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-secondary-text">
              Perfil de acesso
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
            >
              {allowedRoles.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-secondary-text">
                Usuário ativo
              </p>
              <p className="text-[11px] text-secondary-text/60 mt-0.5">
                O usuário {status ? "pode" : "não pode"} acessar o sistema
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
            {loading ? "Salvando..." : "Salvar Alterações"}
          </button>
        </div>
      </div>
    </div>
  );
}
