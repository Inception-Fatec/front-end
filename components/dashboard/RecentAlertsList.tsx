// components/dashboard/RecentAlertsList.tsx

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { SeverityDot } from "./SeverityDot";
import { Skeleton } from "./Skeleton";
import { AlertLogWithDetails } from "@/types/alert";

interface RecentAlertsListProps {
  alerts: AlertLogWithDetails[];
  isLoading: boolean;
}

function timedifference(date_time: string) {
  if (!date_time) return "-";
  const agora = new Date().getTime();
  const iso = date_time.endsWith("Z") ? date_time : date_time + "Z";
  const data = new Date(iso).getTime();
  const diffMs = agora - data;
  const segundos = Math.floor(diffMs / 1000);
  const minutos = Math.floor(segundos / 60);
  if (minutos > 0) return `${minutos} min atrás`;
  return `${segundos} s atrás`;
}

function TempoAtual({ date }: { date: string }) {
  const [_, setTick] = useState(0);

  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(i);
  }, []);

  return <>{timedifference(date)}</>;
}

export function RecentAlertsList({ alerts, isLoading }: RecentAlertsListProps) {
  const router = useRouter();

  return (
    <div className="bg-card-background border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
          <AlertTriangle size={16} className="text-alert" />
          Alertas Recentes
        </div>
        <button
          onClick={() => router.push("/dashboard/alertas?tab=history")}
          className="text-xs text-primary hover:underline transition-colors"
        >
          Ver todos
        </button>
      </div>

      <div className="divide-y divide-border">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-3 p-4">
                <Skeleton className="w-2 h-2 rounded-full mt-1.5 shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))
          : alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex gap-3 p-4 hover:bg-background/50 transition-colors"
              >
                <SeverityDot severity={alert.severity} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {alert.stations?.name}
                  </p>
                  <p className="text-xs text-secondary-text mt-0.5 leading-relaxed">
                    {alert.message}
                  </p>
                  <p className="text-sm text-secondary-text truncate">
                    Valor: {alert.measurement}{" "}
                    {alert.parameters.parameter_types.symbol}
                  </p>
                  <p className="text-[11px] text-secondary-text/60 mt-1 uppercase tracking-wide">
                    <TempoAtual date={alert.created_at} />
                  </p>
                </div>
              </div>
            ))}
      </div>
    </div>
  );
}
