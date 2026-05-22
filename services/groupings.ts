import type { Grouping, GroupingWithStationDetails } from "@/types/grouping";

export async function getGroupings(): Promise<GroupingWithStationDetails[]> {
  const res = await fetch("/api/groupings", { cache: "no-store" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Erro ao buscar grupos.");
  }
  return res.json();
}

export async function getGroupingById(
  id: number,
): Promise<GroupingWithStationDetails> {
  const res = await fetch(`/api/groupings?id=${id}`, { cache: "no-store" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Erro ao buscar grupo.");
  }
  return res.json();
}

export async function createGrouping(name: string): Promise<Grouping> {
  const res = await fetch("/api/groupings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Erro ao criar grupo.");
  }
  return res.json();
}

export async function updateGrouping(
  id: number,
  name: string,
): Promise<Grouping> {
  const res = await fetch("/api/groupings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, name }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Erro ao editar grupo.");
  }
  return res.json();
}

export async function updateGroupingStations(
  id: number,
  stations: number[],
): Promise<void> {
  const res = await fetch("/api/groupings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, stations }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Erro ao salvar estações.");
  }
}

export async function deleteGrouping(id: number): Promise<void> {
  const res = await fetch("/api/groupings", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Erro ao excluir grupo.");
  }
}
