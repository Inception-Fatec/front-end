// components/dashboard/RecentAlertsList.tsx

import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { SeverityDot } from "./SeverityDot";
import { Skeleton } from "./Skeleton";
import type { RecentAlert } from "@/types/api";

interface RecentAlertsListProps {
  alerts: RecentAlert[];
  isLoading: boolean;
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
          onClick={() => router.push("/dashboard/alertas")}
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
                    {alert.stationName}
                  </p>
                  <p className="text-xs text-secondary-text mt-0.5 leading-relaxed">
                    {alert.message}
                  </p>
                  <p className="text-[11px] text-secondary-text/60 mt-1 uppercase tracking-wide">
                    {alert.timeAgo}
                  </p>
                </div>
              </div>
            ))}
      </div>
    </div>
  );
}
