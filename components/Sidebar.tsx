"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Radio,
  Bell,
  BarChart3,
  BookOpen,
  Users,
  LogOut,
  X,
} from "lucide-react";
import type { UserRole } from "@/types/api";

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  allowedRoles?: UserRole[];
}

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Radio, label: "Estações", href: "/dashboard/estacoes" },
  { icon: Bell, label: "Alertas", href: "/dashboard/alertas" },
  { icon: BarChart3, label: "Relatórios", href: "/dashboard/relatorios" },
  { icon: BookOpen, label: "Tutorial", href: "/dashboard/tutorial" },
  {
    icon: Users,
    label: "Usuários",
    href: "/dashboard/usuarios",
    allowedRoles: ["ADMIN", "OPERATOR"],
  },
];

function NavLink({
  item,
  isActive,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={[
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 border",
        isActive
          ? "bg-primary-dim text-primary border-primary-border"
          : "text-secondary-text hover:bg-card-background hover:text-foreground border-transparent",
      ].join(" ")}
    >
      <Icon size={18} className="shrink-0" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function SidebarContent({ onLinkClick }: { onLinkClick?: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = (session?.user?.role ?? "USER") as UserRole;

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === href
      : pathname === href || pathname.startsWith(href + "/");

  const visibleNav = NAV_ITEMS.filter(
    (item) => !item.allowedRoles || item.allowedRoles.includes(userRole),
  );

  return (
    <div className="flex flex-col h-full">
      <div className="h-16 flex items-center px-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx="12" cy="20" r="1.5" fill="white" />
            </svg>
          </div>
          <div className="leading-tight">
            <p className="text-xs font-bold text-foreground">Tecsus</p>
            <p className="text-[10px] text-secondary-text uppercase tracking-widest">
              Meteorological IoT
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleNav.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            isActive={isActive(item.href)}
            onClick={onLinkClick}
          />
        ))}
      </nav>

      <div className="border-t border-border" />

      <div className="px-3 py-3 space-y-1">
        <button
          onClick={() => signOut({ redirectTo: "/login" })}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-danger hover:bg-danger-dim border border-transparent transition-all duration-150"
        >
          <LogOut size={18} className="shrink-0" />
          <span>Sair</span>
        </button>
      </div>
    </div>
  );
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  return (
    <>
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-56 bg-background border-r border-border z-30">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={[
          "md:hidden fixed left-0 top-0 h-screen w-64 bg-background border-r border-border z-50",
          "transition-transform duration-300 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <button
          onClick={onMobileClose}
          className="absolute top-4 right-3 p-1.5 rounded-lg text-secondary-text hover:text-foreground hover:bg-card-background transition-colors"
          aria-label="Fechar menu"
        >
          <X size={18} />
        </button>
        <SidebarContent onLinkClick={onMobileClose} />
      </aside>
    </>
  );
}
