"use client";

import { useState, useEffect } from "react";
import { AlertsTable } from "./AlertsTable";
import { AlertLogsTable } from "./AlertLogsTable";
import type { UserRole } from "@/types/user";
import { useSearchParams } from "next/navigation";

interface AlertsTabsProps {
  sessionRole: UserRole;
}

export function AlertsTabs({ sessionRole }: AlertsTabsProps) {
  const [activeTab, setActiveTab] = useState<"rules" | "history">("rules");
  const searchParams = useSearchParams();

  useEffect(() => {
    const param = searchParams.get("tab");
    if (param) {
      if (param === "history") {
        setActiveTab("history");
        window.history.replaceState({}, "", "/dashboard/alertas");
      }
    }
  }, [searchParams]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Gerenciar Alertas
          </h1>
          <p className="text-sm text-secondary-text mt-0.5">
            {activeTab === "rules"
              ? "Administre os alertas do sistema e suas configurações."
              : "Histórico de ocorrências de alertas no sistema."}
          </p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-border">
        {(["rules", "history"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={[
              "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-secondary-text hover:text-foreground",
            ].join(" ")}
          >
            {tab === "rules" ? "Regras de Alerta" : "Histórico de Alertas"}
          </button>
        ))}
      </div>

      {activeTab === "rules" ? (
        <AlertsTable sessionRole={sessionRole} />
      ) : (
        <AlertLogsTable />
      )}
    </div>
  );
}
