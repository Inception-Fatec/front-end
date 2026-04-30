"use client";

import { useEffect, useRef, useState } from "react";
import { BarChart2, Loader2 } from "lucide-react";
import { MiniBarChart } from "./MiniBarChart";
import { ParamIcon } from "./ParamIcon";
import { Skeleton } from "./Skeleton";
import { getParameterSummaries } from "@/services/dashboard";
import type { ParameterSummary, PeriodKey } from "@/types/dashboard";
import type { GroupingWithStationDetails } from "@/types/grouping";

const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: "30min", label: "Últimos 30min" },
  { key: "1h",    label: "Última 1h"    },
  { key: "2h",    label: "Últimas 2h"   },
  { key: "3h",    label: "Últimas 3h"   },
];

interface ParametersGridProps {
  groups: GroupingWithStationDetails[];
  isLoading: boolean;
}

function formatValue(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

export function ParametersGrid({ groups, isLoading }: ParametersGridProps) {
  const [period,  setPeriod]  = useState<PeriodKey>("30min");
  const [groupId, setGroupId] = useState<number | null>(null);

  const [params,     setParams]     = useState<ParameterSummary[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (isLoading) return;

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    let cancelled = false;

    async function fetchParams() {
      setIsFetching(true);
      setError(null);

      try {
        const data = await getParameterSummaries(period, groupId);
        if (!cancelled) setParams(data);
      } catch (err) {
        if (!cancelled) {
          setError("Falha ao carregar parâmetros.");
          console.error("[ParametersGrid] fetch error:", err);
        }
      } finally {
        if (!cancelled) setIsFetching(false);
      }
    }

    fetchParams();
    return () => { cancelled = true; };
  }, [period, groupId, isLoading]);

  const showSkeletons = isLoading || (isFetching && params.length === 0);
  const showSpinner   = isFetching && params.length > 0;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
          <BarChart2 size={16} className="text-primary" />
          Visão Geral dos Parâmetros
          {showSpinner && (
            <Loader2 size={14} className="text-primary animate-spin ml-1" />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={groupId ?? ""}
            onChange={(e) =>
              setGroupId(e.target.value === "" ? null : Number(e.target.value))
            }
            disabled={isLoading}
            className="text-xs px-3 py-1.5 rounded-lg bg-card-background border border-border text-secondary-text focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
          >
            <option value="">Todas as Regiões</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>

          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodKey)}
            disabled={isLoading}
            className="text-xs px-3 py-1.5 rounded-lg bg-card-background border border-border text-secondary-text focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
          >
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {showSkeletons ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))
        ) : params.length === 0 ? (
          <p className="col-span-full text-sm text-secondary-text text-center py-6">
            Nenhum parâmetro para esta região.
          </p>
        ) : (
          params.map((param) => (
            <div
              key={param.name}
              className="bg-card-background border border-border rounded-xl p-4 transition-opacity duration-300"
              style={{ opacity: isFetching ? 0.5 : 1 }}
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wider text-secondary-text">
                  {param.name}
                </p>
                <span style={{ color: param.color }}>
                  <ParamIcon name={param.name} />
                </span>
              </div>

              <p className="text-2xl font-bold text-foreground mt-2 transition-all duration-500">
                {formatValue(param.value)}
                <span className="text-sm font-normal text-secondary-text ml-1">
                  {param.symbol}
                </span>
              </p>

              <MiniBarChart data={param.chartData[period]} color={param.color} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}