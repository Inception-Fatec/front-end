"use client";

import { useState } from "react";
import { BarChart2 } from "lucide-react";
import { MiniBarChart } from "./MiniBarChart";
import { ParamIcon } from "./ParamIcon";
import { Skeleton } from "./Skeleton";
import type {
  ParameterSummary,
  GroupOption,
  PeriodKey,
  PeriodOption,
} from "@/types/api";

const PERIOD_OPTIONS: PeriodOption[] = [
  { key: "30min", label: "Últimos 30min" },
  { key: "1h", label: "Última 1h" },
  { key: "2h", label: "Últimas 2h" },
  { key: "3h", label: "Últimas 3h" },
];

interface ParametersGridProps {
  params: ParameterSummary[];
  groups: GroupOption[];
  isLoading: boolean;
}

export function ParametersGrid({
  params,
  groups,
  isLoading,
}: ParametersGridProps) {
  const [period, setPeriod] = useState<PeriodKey>("30min");
  const [groupId, setGroupId] = useState<number | null>(null);

  const filtered =
    groupId === null
      ? params
      : params.filter((p) => p.groupIds.includes(groupId));

  function displayValue(param: ParameterSummary): number {
    if (groupId !== null && param.valueByGroup[groupId] !== undefined) {
      return param.valueByGroup[groupId];
    }
    return param.value;
  }

  function formatValue(v: number): string {
    return Number.isInteger(v) ? String(v) : v.toFixed(1);
  }

  return (
    <div>
      {/* Header com filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
          <BarChart2 size={16} className="text-primary" />
          Visão Geral dos Parâmetros
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro por grupo de estações */}
          <select
            value={groupId ?? ""}
            onChange={(e) =>
              setGroupId(e.target.value === "" ? null : Number(e.target.value))
            }
            className="text-xs px-3 py-1.5 rounded-lg bg-card-background border border-border text-secondary-text focus:outline-none focus:border-primary transition-colors"
          >
            <option value="">Todas as Regiões</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          {/* Filtro de período */}
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodKey)}
            className="text-xs px-3 py-1.5 rounded-lg bg-card-background border border-border text-secondary-text focus:outline-none focus:border-primary transition-colors"
          >
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))
        ) : filtered.length === 0 ? (
          <p className="col-span-full text-sm text-secondary-text text-center py-6">
            Nenhum parâmetro para esta região.
          </p>
        ) : (
          filtered.map((param) => {
            const val = displayValue(param);
            return (
              <div
                key={param.name}
                className="bg-card-background border border-border rounded-xl p-4"
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
                  {formatValue(val)}
                  <span className="text-sm font-normal text-secondary-text ml-1">
                    {param.unit}
                  </span>
                </p>

                <MiniBarChart
                  data={param.chartData[period]}
                  color={param.color}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
