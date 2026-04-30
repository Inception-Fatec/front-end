import type {
  DashboardStats,
  ParameterSummary,
  PeriodKey,
} from "@/types/dashboard";
import type { GroupingWithStationDetails } from "@/types/grouping";

export async function getDashboardStats(): Promise<DashboardStats> {
  const res = await fetch("/api/dashboard/stats", { cache: "no-store" });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Erro ao buscar estatísticas.");
  }

  return res.json();
}

export async function getParameterSummaries(
  period: PeriodKey = "30min",
  groupId: number | null = null,
): Promise<ParameterSummary[]> {
  const params = new URLSearchParams({ period });
  if (groupId !== null) params.set("groupId", String(groupId));

  const res = await fetch(`/api/dashboard/parameters?${params.toString()}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Erro ao buscar parâmetros.");
  }

  return res.json();
}

export async function getGroups(): Promise<GroupingWithStationDetails[]> {
  const res = await fetch("/api/groupings", { cache: "no-store" });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Erro ao buscar grupos.");
  }

  return res.json();
}
