"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Bell, Menu, CircleHelp } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import { NotificationsDropdown } from "@/components/header/NotificationsDropdown";
import { UserDropdown } from "@/components/header/UserDropdown";
import { updateStatus } from "@/services/alert-logs";
import { useSession } from "next-auth/react";
import { useTour } from "@/context/TourContext";
import Toast from "@/components/ui/Toast";
import { AlertSeverity } from "@/types/alert";

type ToastAlert = {
  id: number;
  severity: AlertSeverity;
  title: string;
  station: string;
  message: string;
  value: string;
};

interface HeaderProps {
  onMenuOpen: () => void;
}

const BREADCRUMB_MAP: Record<string, string> = {
  "/dashboard": "Live Monitor",
  "/dashboard/estacoes": "Estações",
  "/dashboard/parametros": "Parâmetros",
  "/dashboard/alertas": "Alertas",
  "/dashboard/relatorios": "Relatórios",
  "/dashboard/tutorial": "Tutorial",
  "/dashboard/usuarios": "Usuários",
  "/dashboard/configuracoes": "Configurações",
};

export function Header({ onMenuOpen }: HeaderProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [notifOpen, setNotifOpen] = useState(false);
  const { notifications, notificationAlert, isLoading } = useDashboard();
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set());

  const { startTour } = useTour();
  const [toastAlerts, setToastAlerts] = useState<ToastAlert[]>([]);
  const shownAlerts = useRef<Set<number>>(new Set());

  const userId = session?.user?.id ? Number(session.user.id) : null;

  useEffect(() => {
    if (userId) {
      const tourKey = `tour_completed_user_${userId}`;
      const hasSeenTour = localStorage.getItem(tourKey);

      if (!hasSeenTour) {
        localStorage.setItem(tourKey, "true");
        setTimeout(() => {
          startTour();
        }, 1000);
      }
    }
  }, [userId, startTour]);

  const localAlerts = userId
    ? (notifications.data ?? []).filter((a) => !dismissedIds.has(a.id))
    : [];

  const unreadCount = localAlerts.length;

  useEffect(() => {
    if (!notificationAlert?.length) return;

    notificationAlert.forEach((alert) => {
      if (shownAlerts.current.has(alert.id)) return;

      shownAlerts.current.add(alert.id);

      const toast: ToastAlert = {
        id: alert.id,
        severity: alert.severity,
        title: alert.parameters?.parameter_types?.name || "Novo alerta",
        station: alert.stations?.name || "",
        message: alert.message,
        value: `Valor: ${alert.value ?? "--"} ${
          alert.parameters?.parameter_types?.symbol || ""
        }`,
      };

      setToastAlerts((prev) => {
        const alreadyExists = prev.some((item) => item.id === toast.id);
        if (alreadyExists) return prev;
        return [...prev, toast]; // novo toast vai ao FINAL = aparece embaixo
      });
    });
  }, [notificationAlert]);

  const seenNotifs = useCallback(async (id: number | null) => {
    try {
      await updateStatus(id);
      return true;
    } catch (error) {
      console.error("Error updating alert status:", error);
      return false;
    }
  }, []);

  async function handleMarkAllRead() {
    const result = await seenNotifs(null);
    if (result) {
      setDismissedIds(new Set(notifications.data.map((a) => a.id)));
    }
  }

  async function handleMarkOneRead(id: number) {
    const result = await seenNotifs(id);
    if (result) {
      setDismissedIds((prev) => new Set([...prev, id]));
    }
  }

  function handleBellClick() {
    setNotifOpen((v) => !v);
  }

  const currentPage =
    BREADCRUMB_MAP[pathname] ??
    Object.entries(BREADCRUMB_MAP)
      .filter(([route]) => pathname.startsWith(route + "/"))
      .sort((a, b) => b[0].length - a[0].length)[0]?.[1] ??
    "Dashboard";

  const badgeColor =
    unreadCount >= 3
      ? "bg-red-500"
      : unreadCount === 2
        ? "bg-yellow-500"
        : unreadCount >= 1
          ? "bg-green-500"
          : "";

  return (
    <>
      <header className="sticky top-0 z-20 h-16 flex items-center justify-between px-4 lg:px-6 bg-background border-b border-border">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuOpen}
            className="md:hidden p-2 rounded-lg text-secondary-text hover:text-foreground hover:bg-card-background transition-colors"
            aria-label="Abrir menu"
          >
            <Menu size={20} />
          </button>

          <nav className="flex items-center gap-2 text-sm text-secondary-text">
            <Link
              href="/dashboard"
              className="hover:text-foreground transition-colors"
            >
              Overview
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">{currentPage}</span>
          </nav>
        </div>

        <div className="flex items-center gap-2">
        <button
          onClick={() => {
            setNotifOpen(false);
            startTour();
          }}
          className="p-2 rounded-lg text-secondary-text hover:text-primary hover:bg-primary/10 transition-colors"
          title="Ver tutorial do sistema"
        >
          <CircleHelp size={20} />
        </button>

          <div className="relative">
            <button
            id="notification-bell-btn"
              onClick={handleBellClick}
              className="relative p-2 rounded-lg text-secondary-text hover:text-foreground hover:bg-card-background transition-colors"
              aria-label={`${unreadCount} notificações não lidas`}
              aria-expanded={notifOpen}
            >
              <Bell size={20} />
              {!isLoading && unreadCount > 0 && (
                <span
                  className={[
                    "absolute top-1.5 right-1.5 min-w-4 h-4 px-0.5 flex items-center justify-center rounded-full text-white text-[9px] font-bold shadow-md",
                    badgeColor,
                  ].join(" ")}
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <NotificationsDropdown
                alerts={localAlerts}
                unreadCount={unreadCount}
                onMarkAllRead={handleMarkAllRead}
                onMarkOneRead={handleMarkOneRead}
                onClose={() => setNotifOpen(false)}
              />
            )}
          </div>

          <UserDropdown onOpen={() => setNotifOpen(false)} />
        </div>
      </header>

      {/* Container dos toasts — empilha de cima pra baixo, sem overlap */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col items-end gap-3 pointer-events-none">
        {toastAlerts.map((toast) => (
          <Toast
            key={toast.id}
            severity={toast.severity}
            title={toast.title}
            station={toast.station}
            message={toast.message}
            value={toast.value}
            onClose={() => {
              setToastAlerts((prev) =>
                prev.filter((item) => item.id !== toast.id),
              );
            }}
          />
        ))}
      </div>
    </>
  );
}