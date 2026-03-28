"use client";

// app/dashboard/page.tsx

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Radio, Zap, AlertTriangle, Clock } from "lucide-react";

import { useDashboard } from "@/context/DashboardContext";
import { StatCard } from "@/components/dashboard/StatCard";
import { Skeleton } from "@/components/dashboard/Skeleton";
import { StationsTable } from "@/components/dashboard/StationsTable";
import { RecentAlertsList } from "@/components/dashboard/RecentAlertsList";
import { ParametersGrid } from "@/components/dashboard/ParametersGrid";

function formatSeconds(s: number) {
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export default function DashboardPage() {
  const { status } = useSession();
  const router = useRouter();
  const { stats, stations, alerts, params, groups, isLoading, error, refresh } =
    useDashboard();

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
              sub="dispositivos cadastrados"
            />
            <StatCard
              label="Estações Ativas"
              icon={<Zap size={18} />}
              value={String(stats!.activeStations)}
              sub={`${((stats!.activeStations / stats!.totalStations) * 100).toFixed(1)}% Uptime`}
              valueColor="text-green-400"
            />
            <StatCard
              label="Alertas Ativos"
              icon={<AlertTriangle size={18} />}
              value={String(stats!.activeAlerts).padStart(2, "0")}
              sub="Verificar condições críticas"
              valueColor="text-alert"
            />
            <StatCard
              label="Última Atualização"
              icon={<Clock size={18} />}
              value={formatSeconds(stats!.lastUpdateSeconds)}
              sub="Auto-refresh ativo"
            />
          </>
        )}
      </div>

      {/* Tabela de estações + Alertas recentes */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <StationsTable
            stations={stations}
            totalCount={stats?.totalStations ?? 0}
            isLoading={isLoading}
            onRefresh={refresh}
          />
        </div>
        <RecentAlertsList alerts={alerts} isLoading={isLoading} />
      </div>

      {/* Parâmetros meteorológicos */}
      <ParametersGrid params={params} groups={groups} isLoading={isLoading} />
    </div>
  );
}
