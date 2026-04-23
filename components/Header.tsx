"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Bell, Menu } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import { NotificationsDropdown } from "@/components/header/NotificationsDropdown";
import { UserDropdown } from "@/components/header/UserDropdown";
import type { RecentAlert } from "@/types/api";

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
  const pathname = usePathname();
  const [notifOpen, setNotifOpen] = useState(false);

  const { alerts, isLoading } = useDashboard();

  // Override local de "seen" — vira mutation quando a API estiver pronta
  const [localAlerts, setLocalAlerts] = useState<RecentAlert[] | null>(null);
  const displayAlerts = localAlerts ?? alerts;
  const unreadCount = displayAlerts.filter((a) => !a.seen).length;

  function handleMarkAllRead() {
    setLocalAlerts(displayAlerts.map((a) => ({ ...a, seen: true })));
  }

  function handleBellClick() {
    if (!notifOpen) setLocalAlerts(null);
    setNotifOpen((v) => !v);
  }

  const currentPage =
    BREADCRUMB_MAP[pathname] ??
    Object.entries(BREADCRUMB_MAP)
      .filter(([route]) => pathname.startsWith(route + "/"))
      .sort((a, b) => b[0].length - a[0].length)[0]?.[1] ??
    "Dashboard";

  return (
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
        <div className="relative">
          <button
            onClick={handleBellClick}
            className="relative p-2 rounded-lg text-secondary-text hover:text-foreground hover:bg-card-background transition-colors"
            aria-label={`${unreadCount} notificações não lidas`}
            aria-expanded={notifOpen}
          >
            <Bell size={20} />
            {!isLoading && unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-0.5 flex items-center justify-center rounded-full bg-alert text-white text-[9px] font-bold">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <NotificationsDropdown
              alerts={displayAlerts}
              onMarkAllRead={handleMarkAllRead}
              onClose={() => setNotifOpen(false)}
            />
          )}
        </div>

        <UserDropdown onOpen={() => setNotifOpen(false)} />
      </div>
    </header>
  );
}
