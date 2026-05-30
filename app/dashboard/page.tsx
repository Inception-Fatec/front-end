"use client";

// app/dashboard/page.tsx

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Radio, Zap, AlertTriangle, Clock, Layers } from "lucide-react";

import { useDashboard } from "@/context/DashboardContext";
import { StatCard } from "@/components/dashboard/StatCard";
import { Skeleton } from "@/components/dashboard/Skeleton";
import { StationsTable } from "@/components/dashboard/StationsTable";
import { RecentAlertsList } from "@/components/dashboard/RecentAlertsList";
import { ParametersGrid } from "@/components/dashboard/ParametersGrid";

function timedifference(date_time: string) {
  if (!date_time) return "-";
  const agora = new Date().getTime();
  const data = new Date(date_time.includes("Z") || date_time.includes("+") ? date_time : date_time + "Z").getTime();
  const diffMs = agora - data;
  const segundos = Math.floor(diffMs / 1000);
  const minutos = Math.floor(segundos / 60);
  const horas = Math.floor(minutos / 60);
  const dias = Math.floor(horas / 24);
  if (dias > 0) return `${dias} dia${dias > 1 ? "s" : ""} atrás`;
  if (horas > 0) return `${horas}h atrás`;
  if (minutos > 0) return `${minutos}min atrás`;
  return `${segundos}s atrás`;
}

function TempoAtual({ date }: { date: string }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(i);
  }, []);

  return <>{timedifference(date)}</>;
}

export default function DashboardPage() {
  const { status } = useSession();
  const router = useRouter();
  const { stats, stations, alerts, groups, isLoading, error } = useDashboard();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  if (status === "loading") return null;

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-alert/10 border border-alert/20 text-alert text-xs">
          <AlertTriangle size={14} />
          {error}
        </div>
      )}

      {/* Cards de métricas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))
        ) : (
          <>
            <StatCard
              label="Total de Estações"
              icon={<Radio size={18} />}
              value={String(stats!.totalStations)}
            />
            <StatCard
              label="Estações Ativas"
              icon={<Zap size={18} />}
              value={String(stats!.activeStations)}
              valueColor="text-green-400"
            />
            <StatCard
              label="Total de Grupos"
              icon={<Layers size={18} />}
              value={String(stats!.totalGroups)}
            />
            <StatCard
              label="Última Atualização"
              icon={<Clock size={18} />}
              value={<TempoAtual date={stats!.lastUpdate} />}
            />
          </>
        )}
      </div>

      {/* Tabela de estações + Alertas recentes */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <StationsTable stations={stations} isLoading={isLoading} />
        </div>
        <RecentAlertsList alerts={alerts} isLoading={isLoading} />
      </div>

      {/* Parâmetros meteorológicos */}
      <ParametersGrid groups={groups} isLoading={isLoading} />
    </div>
  );
}
