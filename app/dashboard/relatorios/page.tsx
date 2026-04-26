"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { StationWithDetails } from "@/types/station";
import { AnalyticsFilters } from "@/components/relatorios/AnalyticsFilters";
import type {
  ChartDataState,
  Measurement,
  ParameterWithMeasurements,
} from "@/components/relatorios/types";

import dynamic from "next/dynamic";

const AnalyticsChart = dynamic(
  () =>
    import("@/components/relatorios/AnalyticsChart").then(
      (m) => m.AnalyticsChart,
    ),
  { ssr: false },
);

const TempRangeChart = dynamic(
  () =>
    import("@/components/relatorios/TempRangeChart").then(
      (m) => m.TempRangeChart,
    ),
  { ssr: false },
);

const RainfallChart = dynamic(
  () =>
    import("@/components/relatorios/RainfallChart").then((m) => m.RainfallChart),
  { ssr: false },
);

export default function RelatoriosPage() {
  const { status } = useSession();
  const router = useRouter();

  const [stationId, setStationId] = useState<number | null>(null);
  const [groupId, setGroupId] = useState<number | null>(null);
  const [stations, setStations] = useState<{ id: number; name: string }[]>([]);
  const [groups, setGroups] = useState<{ id: number; name: string }[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [chartData, setChartData] = useState<ChartDataState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  // Lucas Martins - Aqui alterar para buscar os dados
  // do context useDashboard
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [stationsRes, groupsRes] = await Promise.all([
          fetch("/api/stations?limit=50"),
          fetch("/api/groupings"),
        ]);
        const stationsData = await stationsRes.json();
        const groupsData = await groupsRes.json();
        setStations(stationsData.data ?? []);
        setGroups(groupsData ?? []);
      } catch (error) {
        console.error("Erro ao buscar filtros:", error);
      }
    };
    fetchInitialData();
  }, []);

  function handlePreset(period: "1w" | "1m" | "3m" | "1y") {
    const end = new Date();
    const start = new Date();
    if (period === "1w") start.setDate(end.getDate() - 7);
    else if (period === "1m") start.setMonth(end.getMonth() - 1);
    else if (period === "3m") start.setMonth(end.getMonth() - 3);
    else if (period === "1y") start.setFullYear(end.getFullYear() - 1);
    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(end.toISOString().split("T")[0]);
    setDateError(null);
  }

  function aggregateParameters(
    stationsList: StationWithDetails[],
  ): ParameterWithMeasurements[] {
    const typeIds = Array.from(
      new Set(
        stationsList.flatMap((s) =>
          s.parameters.map((p) => p.id_parameter_type),
        ),
      ),
    );

    return typeIds.flatMap((typeId) => {
      const relevantParams = stationsList.flatMap((s) =>
        s.parameters.filter((p) => p.id_parameter_type === typeId),
      ) as ParameterWithMeasurements[];

      if (relevantParams.length === 0) return [];

      const timeMap = new Map<number, { total: number; count: number }>();

      relevantParams.forEach((p) => {
        p.measurements.forEach((m) => {
          const ts = new Date(m.date_time).setMilliseconds(0);
          const current = timeMap.get(ts) ?? { total: 0, count: 0 };
          timeMap.set(ts, {
            total: current.total + m.value,
            count: current.count + 1,
          });
        });
      });

      const avgData: Measurement[] = Array.from(timeMap.entries())
        .map(([ts, stats]) => ({
          id: Math.random(),
          date_time: new Date(ts).toISOString(),
          value: Number((stats.total / stats.count).toFixed(2)),
        }))
        .sort(
          (a, b) =>
            new Date(a.date_time).getTime() - new Date(b.date_time).getTime(),
        );

      return [
        { ...relevantParams[0], measurements: avgData, isAggregated: true },
      ];
    });
  }

  async function handleSearch() {
    if (stationId === null && groupId === null) return;

    setChartData(null);
    setIsLoading(true);

    try {
      const dateParams = new URLSearchParams();
      if (startDate)
        dateParams.append("start_date", new Date(startDate).toISOString());
      if (endDate)
        dateParams.append("end_date", new Date(endDate).toISOString());

      if (groupId !== null) {
        const groupRes = await fetch(`/api/groupings?id=${groupId}`);
        const groupDetails = await groupRes.json();

        const stationIds: number[] = groupDetails.station_groupings.map(
          (sg: { stations: { id: number } }) => sg.stations.id,
        );

        const detailedStations: StationWithDetails[] = await Promise.all(
          stationIds.map((id) =>
            fetch(`/api/stations?id=${id}&${dateParams.toString()}`).then((r) =>
              r.json(),
            ),
          ),
        );

        setChartData({
          name: `Grupo: ${groupDetails.name}`,
          parameters: aggregateParameters(detailedStations),
        });
      } else if (stationId !== null) {
        const res = await fetch(
          `/api/stations?id=${stationId}&${dateParams.toString()}`,
        );
        const jsonData = (await res.json()) as StationWithDetails & {
          name: string;
        };

        setChartData({
          name: jsonData.name,
          parameters: (jsonData.parameters ??
            []) as ParameterWithMeasurements[],
        });
      }
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    } finally {
      setIsLoading(false);
    }
  }
  return (
    <div className="p-6 space-y-6">
      <AnalyticsFilters
        stations={stations}
        groups={groups}
        stationId={stationId}
        groupId={groupId}
        startDate={startDate}
        endDate={endDate}
        isLoading={isLoading}
        onStationChange={setStationId}
        onGroupChange={setGroupId}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onPreset={handlePreset}
        onSearch={handleSearch}
        dateError={dateError}
        setDateError={setDateError}
      />

      <div className="bg-card-background border border-border rounded-xl p-4 min-h-150 flex items-center justify-center">
        <AnalyticsChart chartData={chartData} isLoading={isLoading} />
      </div>
      {chartData && (
        <>
          <TempRangeChart
            parameters={chartData.parameters}
            title={chartData.name}
          />
          <RainfallChart
            parameters={chartData.parameters}
            title={chartData.name}
          />
        </>
      )}
    </div>
  );
}
