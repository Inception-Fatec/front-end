import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase";
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

const FALLBACK_COLOR = "#94a3b8";

function resolveColor(name: string): string {
  const normalized = name.toLowerCase().trim();
  for (const entry of COLOR_MAP) {
    if (entry.keywords.some((kw) => normalized.includes(kw))) {
      return entry.color;
    }
  }
  return FALLBACK_COLOR;
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

  try {
    // ── 1. Resolve station IDs se tiver filtro de grupo ────────────────────
    let stationIds: number[] | null = null;

    if (groupId !== null) {
      const { data: groupings, error: gErr } = await supabaseAdmin
        .from("station_groupings")
        .select("id_station")
        .eq("id_grouping", groupId);

      if (gErr) throw gErr;
      if (!groupings || groupings.length === 0)
        return NextResponse.json([], { status: 200 });

      stationIds = groupings.map((g: { id_station: number }) => g.id_station);
    }

    // ── 2. Busca parâmetros + medições do período em paralelo ──────────────
    let paramQuery = supabaseAdmin
      .from("parameters")
      .select(
        "id, id_station, parameter_types ( name, symbol, factor_value, offset_value )",
      )
      .eq("status", true);

    if (stationIds !== null)
      paramQuery = paramQuery.in("id_station", stationIds);

    const { data: parameters, error: pErr } = await paramQuery;
    if (pErr) throw pErr;
    if (!parameters || parameters.length === 0)
      return NextResponse.json([], { status: 200 });

    const paramIds = parameters.map((p: { id: number }) => p.id);

    const { data: measurements, error: mErr } = await supabaseAdmin
      .from("measurements")
      .select("id_parameter, value, date_time")
      .in("id_parameter", paramIds)
      .gte("date_time", since)
      .lte("date_time", now.toISOString())
      .order("date_time", { ascending: true });

    if (mErr) throw mErr;

    // ── 3. Monta mapa id_parameter → metadados ────────────────────────────
    type ParamMeta = {
      name: string;
      symbol: string;
      factor_value: number;
      offset_value: number;
    };

    const paramMetaMap: Record<number, ParamMeta> = {};
    for (const p of parameters as Array<{
      id: number;
      id_station: number;
      parameter_types:
        | {
            name: string;
            symbol: string;
            factor_value: number;
            offset_value: number;
          }[]
        | null;
    }>) {
      const pt = Array.isArray(p.parameter_types)
        ? p.parameter_types[0]
        : p.parameter_types;
      if (pt) {
        paramMetaMap[p.id] = {
          name: pt.name,
          symbol: pt.symbol,
          factor_value: pt.factor_value,
          offset_value: pt.offset_value,
        };
      }
    }

    // ── 4. Agrupa leituras por tipo, aplicando factor e offset ────────────
    type Reading = { value: number; date_time: string };
    const byType: Record<string, { symbol: string; readings: Reading[] }> = {};

    for (const m of (measurements ?? []) as Array<{
      id_parameter: number;
      value: number;
      date_time: string;
    }>) {
      const meta = paramMetaMap[m.id_parameter];
      if (!meta) continue;

      const realValue = m.value * meta.factor_value + meta.offset_value;

      if (!byType[meta.name])
        byType[meta.name] = { symbol: meta.symbol, readings: [] };

      byType[meta.name].readings.push({
        value: realValue,
        date_time: m.date_time,
      });
    }

    // ── 5. Monta ParameterSummary[] ───────────────────────────────────────
    const sinceMs = new Date(since).getTime();
    const nowMs = now.getTime();
    const slotMs = (nowMs - sinceMs) / BARS_PER_PERIOD[period];

    const summaries: ParameterSummary[] = Object.entries(byType).map(
      ([name, { symbol, readings }]) => {
        const value =
          readings.length === 0
            ? 0
            : readings.reduce((acc, r) => acc + r.value, 0) / readings.length;

        const slots: number[][] = Array.from(
          { length: BARS_PER_PERIOD[period] },
          () => [],
        );
        for (const r of readings) {
          const t = new Date(
            r.date_time.endsWith("Z") ? r.date_time : r.date_time + "Z",
          ).getTime();
          const idx = Math.min(
            Math.floor((t - sinceMs) / slotMs),
            BARS_PER_PERIOD[period] - 1,
          );
          if (idx >= 0) slots[idx].push(r.value);
        }
        const chartSeries: number[] = slots.map((s) =>
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
        } satisfies ParameterSummary;
      },
    );

    return NextResponse.json(summaries, { status: 200 });
  } catch (err) {
    console.error("[GET /api/dashboard/parameters] error:", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
