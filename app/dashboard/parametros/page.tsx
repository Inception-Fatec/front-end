import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ParametersTable } from "@/components/parameters/ParametersTable";
import sql from "@/lib/db-postgres";
import type { PaginatedParameters, ParameterType } from "@/types/parameter";

export default async function ParametrosPage() {
  const session = await auth();
  if (!session) redirect("/login");

  let initialData: PaginatedParameters;
  let activeCount = 0;
  let uniqueActiveCount = 0;

  try {
    const data = await sql<ParameterType[]>`
      SELECT pt.* FROM parameter_types pt
      ORDER BY pt.id ASC
      LIMIT 5 OFFSET 0
    `;

    const [{ count }] =
      await sql`SELECT COUNT(*)::int as count FROM parameter_types`;
    const [{ active }] =
      await sql`SELECT COUNT(*)::int as active FROM parameters WHERE status = true`;
    const [{ unique_count }] =
      await sql`SELECT COUNT(*)::int as unique_count FROM parameter_types`;

    activeCount = active ?? 0;
    uniqueActiveCount = unique_count ?? 0;

    const paramTypeIds = data.map((pt: { id: number }) => pt.id);
    const linkedByType = new Map<number, { id: number; name: string }[]>();
    paramTypeIds.forEach((id: number) => linkedByType.set(id, []));

    if (paramTypeIds.length > 0) {
      const paramLinks = await sql<
        Array<{ id_parameter_type: number; id_station: number }>
      >`
        SELECT id_parameter_type, id_station FROM parameters
        WHERE id_parameter_type = ANY(${paramTypeIds}) AND status = true
      `;

      const stationIds = [...new Set(paramLinks.map((l) => l.id_station))];

      const stationRows =
        stationIds.length > 0
          ? await sql<Array<{ id: number; name: string }>>`
            SELECT id, name FROM stations WHERE id = ANY(${stationIds})
          `
          : [];

      const stationById = new Map(
        stationRows.map((s: { id: number; name: string }) => [s.id, s]),
      );

      for (const link of paramLinks as Array<{
        id_parameter_type: number;
        id_station: number;
      }>) {
        const station = stationById.get(link.id_station);
        if (!station) continue;
        const current = linkedByType.get(link.id_parameter_type) ?? [];
        if (!current.some((s) => s.id === (station as { id: number }).id))
          linkedByType.set(link.id_parameter_type, [
            ...current,
            station as { id: number; name: string },
          ]);
      }
    }

    initialData = {
      data: data.map((pt: PaginatedParameters["data"][number]) => ({
        ...pt,
        linked_stations: linkedByType.get(pt.id) ?? [],
      })),
      pagination: {
        page: 1,
        limit: 5,
        total: count ?? 0,
        totalPages: Math.max(1, Math.ceil((count ?? 0) / 5)),
      },
    };
  } catch {
    initialData = {
      data: [],
      pagination: { page: 1, limit: 5, total: 0, totalPages: 1 },
    };
  }

  return (
    <ParametersTable
      initialData={initialData}
      activeCount={activeCount}
      uniqueActiveCount={uniqueActiveCount}
    />
  );
}
