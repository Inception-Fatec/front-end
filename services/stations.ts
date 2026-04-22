import type { PaginatedStations, StationWithGroupings } from "@/types/station";

const PAGE_SIZE = 8;

interface GetStationsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  grouping?: string;
}

export async function getStations({
  page = 1,
  limit = PAGE_SIZE,
  search = "",
  status = "all",
  grouping = "all",
}: GetStationsParams = {}): Promise<PaginatedStations> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    search,
    status,
    grouping,
  });

  const res = await fetch(`/api/stations?${params}`, { cache: "no-store" });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Erro ao buscar estações.");
  }

  return res.json();
}

export interface CreateStationPayload {
  name: string;
  id_datalogger: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  parameters?: number[];
  groupings?: number[];
  status?: boolean;
}

export async function createStation(
  payload: CreateStationPayload,
): Promise<StationWithGroupings> {
  const res = await fetch("/api/stations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Erro ao criar estação.");
  }

  return res.json();
}

export async function deleteStation(id: number): Promise<void> {
  const res = await fetch("/api/stations", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Erro ao deletar estação.");
  }
}

export async function getStationById(id: number): Promise<import("@/types/station").StationWithDetails> {
  const res = await fetch(`/api/stations?id=${id}`, { cache: "no-store" });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Erro ao buscar estação.");
  }

  return res.json();
}