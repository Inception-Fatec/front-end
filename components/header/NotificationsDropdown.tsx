"use client";

import { useRouter } from "next/navigation";
import {
  Thermometer,
  Droplets,
  Wind,
  Gauge,
  CloudRain,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { AlertLogWithDetails, AlertSeverity } from "@/types/alert";

const SEVERITY_STYLES: Record<
  AlertSeverity,
  { border: string; iconBg: string; iconColor: string }
> = {
  CRITICAL: {
    border: "border-l-alert",
    iconBg: "bg-alert/15",
    iconColor: "text-alert",
  },
  MODERATE: {
    border: "border-l-yellow-400",
    iconBg: "bg-yellow-400/15",
    iconColor: "text-yellow-400",
  },
  MINOR: {
    border: "border-l-primary",
    iconBg: "bg-primary/15",
    iconColor: "text-primary",
  },
};

function AlertIcon({ parameterName }: { parameterName: string }) {
  const name = parameterName.toLowerCase();
  const size = 14;
  if (name.includes("temperatura")) return <Thermometer size={size} />;
  if (name.includes("umidade")) return <Droplets size={size} />;
  if (name.includes("vento")) return <Wind size={size} />;
  if (name.includes("pressão") || name.includes("pressao"))
    return <Gauge size={size} />;
  if (name.includes("chuva") || name.includes("pluviométrico"))
    return <CloudRain size={size} />;
  return <AlertTriangle size={size} />;
}

interface NotificationsDropdownProps {
  alerts: AlertLogWithDetails[];
  unreadCount: number;
  onMarkAllRead: () => void;
  onMarkOneRead: (id: number) => void;
  onClose: () => void;
}

export function NotificationsDropdown({
  alerts,
  unreadCount,
  onMarkAllRead,
  onMarkOneRead,
  onClose,
}: NotificationsDropdownProps) {
  const router = useRouter();

  function formatDate(date: string) {
    const now = new Date().getTime();
    const past = new Date(date).getTime();

    const diffMs = now - past;

    const minutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "agora";
    if (minutes < 60) return `há ${minutes}min`;
    if (hours < 24) return `há ${hours}h`;
    return `há ${days} dias`;
  }

  return (
    <>
      <div
        className="fixed inset-0 z-10"
        onClick={onClose}
        aria-hidden="true"
      />

      <div data-tour-id="tour-header-notifications" className="absolute right-0 mt-2 w-80 bg-card-background border border-border rounded-xl shadow-2xl z-20 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-semibold text-foreground">
            Notificações
            {unreadCount > 0 && (
              <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-alert/15 text-alert">
                {unreadCount}
              </span>
            )}
          </span>
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className="text-[11px] text-primary hover:underline transition-colors"
            >
              Marcar todas como lidas
            </button>
          )}
        </div>

        {/* Lista */}
        <div className="max-h-80 overflow-y-auto divide-y divide-border">
          {alerts?.length === 0 ? (
            <p className="px-4 py-6 text-sm text-secondary-text text-center">
              Nenhuma notificação.
            </p>
          ) : (
            alerts?.map((alert) => {
              const styles = SEVERITY_STYLES[alert.severity];
              return (
                <div
                  key={alert.id}
                  onClick={() => onMarkOneRead(alert.id)}
                  className={[
                    "flex gap-3 px-4 py-3 border-l-2 transition-colors",
                    styles.border,
                    "hover:bg-background/50",
                    !alert.user_alerts?.seen ? "bg-background/30" : "",
                  ].join(" ")}
                >
                  <div
                    className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center ${styles.iconBg} ${styles.iconColor}`}
                  >
                    <AlertIcon
                      parameterName={alert.parameters.parameter_types.name}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground leading-tight truncate">
                        {alert.parameters.parameter_types.name}
                      </p>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] text-secondary-text whitespace-nowrap">
                          {formatDate(alert.created_at)}
                        </span>
                        {!alert.user_alerts?.seen && (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-secondary-text mt-0.5">
                      {alert.stations?.name}
                    </p>
                    <p className="text-[11px] font-medium mt-0.5 text-foreground">
                      {alert.message}
                    </p>
                    <p
                      className={`text-[11px] font-medium mt-0.5 ${styles.iconColor}`}
                    >
                      Valor: {alert.value}{" "}
                      {alert.parameters.parameter_types.symbol}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border">
          <button
            onClick={() => {
              router.push("/dashboard/alertas?tab=history");
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-primary/30 text-primary text-sm font-medium hover:bg-primary/10 transition-colors"
          >
            Ver todos os alertas
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </>
  );
}
