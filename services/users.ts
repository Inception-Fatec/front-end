import type {
  PaginatedUsers,
  CreateUserPayload,
  UpdateUserPayload,
} from "@/types/user";

const PAGE_SIZE = 8;

interface GetUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
}

export async function getUsers({
  page = 1,
  limit = PAGE_SIZE,
  search = "",
  role = "all",
}: GetUsersParams = {}): Promise<PaginatedUsers> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    search,
    role,
  });

  const res = await fetch(`/api/users?${params}`, { cache: "no-store" });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Erro ao buscar usuários.");
  }

  return res.json();
}

export async function createUser(payload: CreateUserPayload): Promise<void> {
  const res = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Erro ao criar usuário.");
  }
}

export async function updateUser(
  id: number,
  payload: UpdateUserPayload,
): Promise<void> {
  const res = await fetch(`/api/users/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Erro ao atualizar usuário.");
  }
}

export async function deleteUser(id: number): Promise<void> {
  const res = await fetch(`/api/users/${id}`, { method: "DELETE" });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Erro ao deletar usuário.");
  }
}
