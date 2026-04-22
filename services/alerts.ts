import type { PaginatedAlerts, AlertPayload } from "@/types/alert";

const PAGE_SIZE = 8;

interface GetAlertsParams {
  page?: number;
  limit?: number;
  search?: string;
  parameterType?: number;
  severity?: string;
}

export async function getAlerts({
  page = 1,
  limit = PAGE_SIZE,
  search = "",
  parameterType = 0,
  severity = "",
}: GetAlertsParams = {}): Promise<PaginatedAlerts> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    search,
    parameterType: String(parameterType),
    severity,
  });

  const res = await fetch(`/api/alerts?${params}`, { cache: "no-store" });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Erro ao buscar alertas.");
  }

  return res.json();
}

export async function createAlert(payload: AlertPayload): Promise<void> {
  const { id: _, ...data } = payload;
  const res = await fetch("/api/alerts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Erro ao criar alerta.");
  }
}

export async function updateAlert(payload: AlertPayload): Promise<void> {
  const res = await fetch(`/api/alerts`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Erro ao atualizar alerta.");
  }
}

export async function updateAlertStatus(
  id: number,
  status: boolean,
): Promise<void> {
  const res = await fetch(`/api/alerts`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, status }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Erro ao atualizar status do alerta.");
  }
}

export async function deleteAlert(id: number): Promise<void> {
  const res = await fetch(`/api/alerts`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Erro ao deletar alerta.");
  }
}
