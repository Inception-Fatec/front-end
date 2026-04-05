"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import type { UserRole } from "@/types/api";
import { LogOut } from "lucide-react";

const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: "Administrador",
  OPERATOR: "Operador",
  USER: "Usuário",
};

interface UserDropdownProps {
  onOpen?: () => void; // callback para fechar outros dropdowns ao abrir este
}

export function UserDropdown({ onOpen }: UserDropdownProps) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  const initials = (session?.user?.name ?? "U")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

  const userRole = (session?.user?.role ?? "USER") as UserRole;

  function handleOpen() {
    setOpen((v) => !v);
    onOpen?.();
  }

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-card-background transition-colors"
        aria-label="Menu de perfil"
        aria-expanded={open}
      >
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
          {initials}
        </div>
        <div className="hidden sm:flex flex-col items-start leading-tight">
          <span className="text-sm font-medium text-foreground max-w-[120px] truncate">
            {session?.user?.name}
          </span>
          <span className="text-[11px] text-secondary-text">
            {ROLE_LABEL[userRole]}
          </span>
        </div>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 mt-2 w-52 bg-card-background border border-border rounded-xl shadow-2xl z-20 overflow-hidden">
            {/* Info do usuário */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {session?.user?.name}
                </p>
                <p className="text-[11px] text-secondary-text truncate">
                  {session?.user?.email}
                </p>
                <span className="inline-block mt-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary-dim text-primary">
                  {ROLE_LABEL[userRole]}
                </span>
              </div>
            </div>

            <Link
              href="/dashboard/configuracoes"
              onClick={() => setOpen(false)}
              className="flex items-center px-4 py-2.5 text-sm text-secondary-text hover:text-foreground hover:bg-background transition-colors"
            >
              Meu perfil
            </Link>

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
        </>
      )}
    </div>
  );
}
