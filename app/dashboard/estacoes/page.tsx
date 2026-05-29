import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { StationsTable } from "@/components/stations/StationsTable";
import sql from "@/lib/db-postgres";
import type { PaginatedStations, StationWithParameters } from "@/types/station";

export default async function EstacoesPage() {
  const session = await auth();

  if (!session) redirect("/login");

  let initialData: PaginatedStations;

  try {
    const data = await sql`
      SELECT s.*,
        json_agg(DISTINCT jsonb_build_object('id_grouping', sg.id_grouping, 'groupings', jsonb_build_object('name', g.name))) FILTER (WHERE sg.id IS NOT NULL) as station_groupings,
        json_agg(DISTINCT jsonb_build_object('id', p.id, 'id_parameter_type', p.id_parameter_type, 'parameter_types', jsonb_build_object('name', pt.name, 'unit', pt.unit, 'symbol', pt.symbol))) FILTER (WHERE p.id IS NOT NULL) as parameters
      FROM stations s
      LEFT JOIN station_groupings sg ON sg.id_station = s.id
      LEFT JOIN groupings g ON g.id = sg.id_grouping
      LEFT JOIN parameters p ON p.id_station = s.id
      LEFT JOIN parameter_types pt ON pt.id = p.id_parameter_type
      GROUP BY s.id
      ORDER BY s.created_at DESC
      LIMIT 8
    `;

    const [{ count }] = await sql`SELECT COUNT(*)::int as count FROM stations`;

    initialData = {
      data: data as unknown as StationWithParameters[],
      pagination: {
        page: 1,
        limit: 8,
        total: count ?? 0,
        totalPages: Math.max(1, Math.ceil((count ?? 0) / 8)),
      },
    };
  } catch {
    initialData = {
      data: [],
      pagination: { page: 1, limit: 8, total: 0, totalPages: 1 },
    };
  }

  return (
    <StationsTable
      initialData={initialData}
      sessionRole={session.user.role as "ADMIN" | "OPERATOR" | "USER"}
    />
  );
}
