import { auth } from "@/auth";
import sql from "@/lib/db-postgres";
import { NextRequest, NextResponse } from "next/server";
import type { ParameterSummary, PeriodKey } from "@/types/dashboard";

const COLOR_MAP: { keywords: string[]; color: string }[] = [
  {
    keywords: [
      "pluviométrico",
      "pluviometrico",
      "chuva",
      "precipitação",
      "precipitacao",
    ],
    color: "#1a8cff",
  },
  {
    keywords: ["velocidade do vento", "vel. vento", "vento"],
    color: "#14b8a6",
  },
  { keywords: ["temperatura"], color: "#f97316" },
  { keywords: ["umidade", "umid"], color: "#3b82f6" },
  { keywords: ["pressão", "pressao"], color: "#8b5cf6" },
];

function resolveColor(name: string): string {
  const normalized = name.toLowerCase().trim();
  for (const entry of COLOR_MAP) {
    if (entry.keywords.some((kw) => normalized.includes(kw)))
      return entry.color;
  }
  return "#94a3b8";
}

const PERIOD_MINUTES: Record<PeriodKey, number> = {
  "30min": 30,
  "1h": 60,
  "2h": 120,
  "3h": 180,
};
const BARS_PER_PERIOD: Record<PeriodKey, number> = {
  "30min": 6,
  "1h": 6,
  "2h": 8,
  "3h": 9,
};

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const period = (searchParams.get("period") ?? "30min") as PeriodKey;
  const groupId = searchParams.get("groupId")
    ? Number(searchParams.get("groupId"))
    : null;
  const minutes = PERIOD_MINUTES[period] ?? 30;


  const now = new Date();
  const since = new Date(now.getTime() - minutes * 60_000).toISOString();
  const until = now.toISOString();

  try {
    let stationFilter = sql``;
    if (groupId !== null) {
      const groupings = await sql<
        Array<{ id_station: number }>
      >`SELECT id_station FROM station_groupings WHERE id_grouping = ${groupId}`;
      if (groupings.length === 0) return NextResponse.json([], { status: 200 });
      const ids = groupings.map((g: { id_station: number }) => g.id_station);
      stationFilter = sql`AND p.id_station = ANY(${ids})`;
    }

    const parameters = await sql<
      Array<{
        id: number;
        id_station: number;
        name: string;
        symbol: string;
        factor_value: number;
        offset_value: number;
      }>
    >`
      SELECT p.id, p.id_station, pt.name, pt.symbol, pt.factor_value, pt.offset_value
      FROM parameters p
      INNER JOIN parameter_types pt ON pt.id = p.id_parameter_type
      WHERE p.status = true ${stationFilter}
    `;
    if (parameters.length === 0) return NextResponse.json([], { status: 200 });

    const paramIds = parameters.map((p) => p.id);

    const measurements = await sql<
      Array<{ id_parameter: number; value: number; date_time: string }>
    >`
      SELECT id_parameter, value, date_time
      FROM measurements
      WHERE id_parameter = ANY(${paramIds})
        AND date_time >= ${since}
        AND date_time <= ${until}
      ORDER BY date_time ASC
    `;

    type Reading = { value: number; date_time: string };
    const byType: Record<string, { symbol: string; readings: Reading[] }> = {};

    for (const m of measurements) {
      const param = parameters.find((p) => p.id === m.id_parameter);
      if (!param) continue;
      const realValue = Number(m.value) * Number(param.factor_value) + Number(param.offset_value);
      if (!byType[param.name])
        byType[param.name] = { symbol: param.symbol, readings: [] };
      byType[param.name].readings.push({
        value: realValue,
        date_time: m.date_time,
      });
    }

    const sinceMs = new Date(since).getTime();
    const nowMs = now.getTime();
    const slotMs = (nowMs - sinceMs) / BARS_PER_PERIOD[period];

    const summaries: ParameterSummary[] = Object.entries(byType).map(
      ([name, { symbol, readings }]) => {
        const value =
          readings.length === 0
            ? 0
            : readings.reduce((acc, r) => acc + Number(r.value), 0) / readings.length;
        const slots: number[][] = Array.from(
          { length: BARS_PER_PERIOD[period] },
          () => [],
        );
        for (const r of readings) {
          const t = new Date(r.date_time).getTime();
          const idx = Math.min(
            Math.floor((t - sinceMs) / slotMs),
            BARS_PER_PERIOD[period] - 1,
          );
          if (idx >= 0) slots[idx].push(r.value);
        }
        const chartSeries = slots.map((s) =>
          s.length === 0 ? 0 : s.reduce((a, v) => a + v, 0) / s.length,
        );
        const emptyBars = Array(BARS_PER_PERIOD[period]).fill(0);
        const chartData: Record<PeriodKey, number[]> = {
          "30min": emptyBars,
          "1h": emptyBars,
          "2h": emptyBars,
          "3h": emptyBars,
        };
        chartData[period] = chartSeries;

        return {
          name,
          symbol,
          value: Math.round(value * 10) / 10,
          color: resolveColor(name),
          chartData,
        };
      },
    );

    return NextResponse.json(summaries, { status: 200 });
  } catch (err) {
    console.error("[GET /api/dashboard/parameters] error:", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}