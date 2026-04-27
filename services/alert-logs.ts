import type { PaginatedAlertLogs } from "@/types/alert";

const PAGE_SIZE = 8;

interface GetAlertLogsParams {
  page?: number;
  limit?: number;
  search?: string;
  parameterType?: number;
  severity?: string;
  station?: number;
  all?: boolean;
}

export async function getAlertLogs({
  page = 1,
  limit = PAGE_SIZE,
  search = "",
  parameterType = 0,
  severity = "",
  station = 0,
  all = false,
}: GetAlertLogsParams = {}): Promise<PaginatedAlertLogs> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    search,
    parameterType: String(parameterType),
    severity,
    station: String(station),
    all: String(all),
  });

  const res = await fetch(`/api/alert-logs?${params}`, { cache: "no-store" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Erro ao buscar alertas.");
  }
  return res.json();
}
