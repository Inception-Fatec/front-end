import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { StationsTable } from "@/components/stations/StationsTable";
import type { PaginatedStations, StationWithParameters } from "@/types/station";

export default async function EstacoesPage() {
    const session = await auth();

    if (!session) redirect("/login");

    let initialData: PaginatedStations;

    try {
        const { supabaseAdmin } = await import("@/lib/supabase");

        const { data, count, error } = await supabaseAdmin
            .from("stations")
            .select(
                `
        id, name, address, latitude, longitude, id_datalogger,
        last_measurement, created_at, status,
        station_groupings ( id_grouping, groupings ( name ) ),
        parameters ( id, id_parameter_type, parameter_types ( name, unit, symbol ) )
      `,
                { count: "exact" },
            )
            .order("created_at", { ascending: false })
            .range(0, 7);

        if (error) throw error;

        initialData = {
            data: (data ?? []) as unknown as StationWithParameters[],
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