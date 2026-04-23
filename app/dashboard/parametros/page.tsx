import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ParametersTable } from "@/components/parameters/ParametersTable";
import type { PaginatedParameters } from "@/types/parameter";

export default async function ParametrosPage() {
  const session = await auth();

  if (!session) redirect("/login");

  let initialData: PaginatedParameters;
  let activeCount = 0;
  let uniqueActiveCount = 0;

  try {
    const { supabaseAdmin } = await import("@/lib/supabase");

    const [{ data, count, error }, { count: active, error: activeError }, { count: uniqueCount, error: uniqueError }] =
      await Promise.all([
        supabaseAdmin
          .from("parameter_types")
          .select("id, name, unit, symbol, factor_value, offset_value, json_name", {
            count: "exact",
          })
          .order("id", { ascending: true })
          .range(0, 4),
        supabaseAdmin
          .from("parameters")
          .select("id", { count: "exact", head: true })
          .eq("status", true),
        supabaseAdmin
          .from("parameter_types")
          .select("id", { count: "exact", head: true }),
      ]);

    if (error) throw error;
    if (activeError) throw activeError;
    if (uniqueError) throw uniqueError;

    activeCount = active ?? 0;
    uniqueActiveCount = uniqueCount ?? 0;

    const rows = (data ?? []) as PaginatedParameters["data"];
    const parameterTypeIds = rows.map((row: { id: number }) => row.id);

    const linkedStationsByType = new Map<number, { id: number; name: string }[]>();

    parameterTypeIds.forEach((parameterTypeId: number) => {
      linkedStationsByType.set(parameterTypeId, []);
    });

    if (parameterTypeIds.length > 0) {
      const { data: parameterLinks, error: parameterLinksError } = await supabaseAdmin
        .from("parameters")
        .select("id_parameter_type,id_station")
        .in("id_parameter_type", parameterTypeIds)
        .eq("status", true);

      if (parameterLinksError) throw parameterLinksError;

      const stationIds = Array.from(
        new Set((parameterLinks ?? []).map((link: { id_station: number }) => link.id_station)),
      );

      const stationById = new Map<number, { id: number; name: string }>();

      if (stationIds.length > 0) {
        const { data: stationRows, error: stationRowsError } = await supabaseAdmin
          .from("stations")
          .select("id,name")
          .in("id", stationIds);

        if (stationRowsError) throw stationRowsError;

        (stationRows ?? []).forEach((station: { id: number; name: string }) => {
          stationById.set(station.id, station);
        });
      }

      (parameterLinks ?? []).forEach((link: { id_parameter_type: number; id_station: number }) => {
        const station = stationById.get(link.id_station);
        if (!station) return;

        const current = linkedStationsByType.get(link.id_parameter_type) ?? [];
        if (!current.some((existing) => existing.id === station.id)) {
          linkedStationsByType.set(link.id_parameter_type, [...current, station]);
        }
      });
    }

    initialData = {
      data: rows.map((parameterType: PaginatedParameters["data"][number]) => ({
        ...parameterType,
        linked_stations: linkedStationsByType.get(parameterType.id) ?? [],
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
      pagination: {
        page: 1,
        limit: 5,
        total: 0,
        totalPages: 1,
      },
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
