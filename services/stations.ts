import type { PaginatedStations } from "@/types/station";

const PAGE_SIZE = 8;

interface GetStationsParams {
  page?: number;
  limit?: number | "all";
  search?: string;
}

export async function getStations({
  page = 1,
  limit = PAGE_SIZE,
  search = "",
}: GetStationsParams = {}): Promise<PaginatedStations> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    search,
  });

  const res = await fetch(`/api/stations?${params}`, { cache: "no-store" });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Erro ao buscar estações.");
  }

  return res.json();
}
