"use client";

import { useState, useCallback } from "react";
import { Pencil, Trash2, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { RoleBadge } from "./RoleBadge";
import { UserAvatar } from "./UserAvatar";
import { CreateUserModal } from "./CreateUserModal";
import { EditUserModal } from "./EditUserModal";
import { DeleteUserModal } from "./DeleteUserModal";
import { UserFilters } from "./UserFilters";
import { getUsers } from "@/services/users";
import type { User, UserRole, PaginatedUsers } from "@/types/user";

interface UsersTableProps {
  initialData: PaginatedUsers;
  sessionRole: UserRole;
  sessionUserId: string;
}

const CREATABLE_ROLES: Record<UserRole, UserRole[]> = {
  ADMIN: ["ADMIN", "OPERATOR", "USER"],
  OPERATOR: ["OPERATOR", "USER"],
  USER: [],
};

function canManage(sessionRole: UserRole, targetRole: UserRole): boolean {
  if (sessionRole === "ADMIN") return true;
  if (sessionRole === "OPERATOR") return targetRole !== "ADMIN";
  return false;
}

export function UsersTable({
  initialData,
  sessionRole,
  sessionUserId,
}: UsersTableProps) {
  const [data, setData] = useState<PaginatedUsers>(initialData);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [loading, setLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);

  const fetchPage = useCallback(
    async (page: number, s = search, r = roleFilter) => {
      setLoading(true);
      try {
        const result = await getUsers({ page, search: s, role: r });
        setData(result);
      } finally {
        setLoading(false);
      }
    },
    [search, roleFilter],
  );

  function handleSearch(value: string) {
    setSearch(value);
    fetchPage(1, value, roleFilter);
  }

  function handleRoleFilter(value: string) {
    setRoleFilter(value);
    fetchPage(1, search, value);
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("pt-BR");
  }

  const allowedRoles = CREATABLE_ROLES[sessionRole];

  return (
    <>
      <div className="space-y-4">
        {/* Header da página */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Gerenciar Usuários
            </h1>
            <p className="text-sm text-secondary-text mt-0.5">
              Administre os perfis de acesso ao sistema e permissões dos
              operadores.
            </p>
          </div>
          {allowedRoles.length > 0 && (
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors shrink-0"
            >
              <Plus size={16} />
              Novo Usuário
            </button>
          )}
        </div>

        {/* Filtros */}
        <UserFilters
          search={search}
          roleFilter={roleFilter}
          sessionRole={sessionRole}
          onSearch={handleSearch}
          onRoleFilter={handleRoleFilter}
        />

        {/* Tabela */}
        <div className="bg-card-background border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-wider text-secondary-text">
                  <th className="text-left px-4 py-3 font-medium">Nome</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">
                    E-mail
                  </th>
                  <th className="text-left px-4 py-3 font-medium">Perfil</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">
                    Cadastrado em
                  </th>
                  <th className="text-right px-4 py-3 font-medium">Ações</th>
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
                      Nenhum usuário encontrado.
                    </td>
                  </tr>
                ) : (
                  data.data.map((user, index) => {
                    const isSelf = String(user.id) === sessionUserId;
                    const manageable = canManage(sessionRole, user.role);
                    return (
                      <tr
                        key={user.id}
                        className="hover:bg-background/50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <UserAvatar name={user.name} index={index} />
                            <span className="font-medium text-foreground">
                              {user.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-secondary-text hidden sm:table-cell">
                          {user.email}
                        </td>
                        <td className="px-4 py-3">
                          <RoleBadge role={user.role} />
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-medium ${user.status ? "text-green-400" : "text-secondary-text"}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${user.status ? "bg-green-400" : "bg-secondary-text"}`}
                            />
                            {user.status ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-secondary-text text-xs hidden lg:table-cell">
                          {formatDate(user.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {manageable && (
                              <button
                                onClick={() => setEditUser(user)}
                                className="p-1.5 rounded-lg text-secondary-text hover:text-foreground hover:bg-background transition-colors"
                                title="Editar"
                              >
                                <Pencil size={14} />
                              </button>
                            )}
                            {manageable && !isSelf && (
                              <button
                                onClick={() => setDeleteUser(user)}
                                className="p-1.5 rounded-lg text-secondary-text hover:text-danger hover:bg-danger-dim transition-colors"
                                title="Excluir"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
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
              {data.total === 0
                ? "Nenhum resultado"
                : `Exibindo ${(data.page - 1) * 8 + 1}–${Math.min(data.page * 8, data.total)} de ${data.total} usuários`}
            </p>
            {data.totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => fetchPage(data.page - 1)}
                  disabled={data.page === 1 || loading}
                  className="px-3 py-1.5 text-xs rounded-lg border border-border text-secondary-text hover:bg-background disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: data.totalPages }, (_, i) => i + 1).map(
                  (n) => (
                    <button
                      key={n}
                      onClick={() => fetchPage(n)}
                      disabled={loading}
                      className={[
                        "w-7 h-7 text-xs rounded-lg font-semibold transition-colors",
                        n === data.page
                          ? "bg-primary text-white"
                          : "border border-border text-secondary-text hover:bg-background",
                      ].join(" ")}
                    >
                      {n}
                    </button>
                  ),
                )}
                <button
                  onClick={() => fetchPage(data.page + 1)}
                  disabled={data.page === data.totalPages || loading}
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
        <CreateUserModal
          allowedRoles={allowedRoles}
          onClose={() => setCreateOpen(false)}
          onSuccess={() => fetchPage(1)}
        />
      )}
      {editUser && (
        <EditUserModal
          user={editUser}
          allowedRoles={CREATABLE_ROLES[sessionRole]}
          onClose={() => setEditUser(null)}
          onSuccess={() => fetchPage(data.page)}
        />
      )}
      {deleteUser && (
        <DeleteUserModal
          user={deleteUser}
          onClose={() => setDeleteUser(null)}
          onSuccess={() => fetchPage(data.page)}
        />
      )}
    </>
  );
}
