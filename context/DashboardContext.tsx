"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  getDashboardStats,
  getRecentAlerts,
  getStationRows,
  getParameterSummaries,
  getGroups,
} from "@/services/dashboard";

import type {
  DashboardStats,
  RecentAlert,
  StationRow,
  ParameterSummary,
  GroupOption,
} from "@/types/api";

const POLL_INTERVAL_MS = 60_000;

interface DashboardContextValue {
  stats: DashboardStats | null;
  stations: StationRow[];
  alerts: RecentAlert[];
  params: ParameterSummary[];
  groups: GroupOption[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [stations, setStations] = useState<StationRow[]>([]);
  const [alerts, setAlerts] = useState<RecentAlert[]>([]);
  const [params, setParams] = useState<ParameterSummary[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isFirstLoad = useRef(true);
  const isMounted = useRef(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAll = useCallback(async () => {
    if (isFirstLoad.current) setIsLoading(true);

    try {
      const [s, st, al, p, g] = await Promise.all([
        getDashboardStats(),
        getStationRows(4),
        getRecentAlerts(4),
        getParameterSummaries(),
        getGroups(),
      ]);

      if (!isMounted.current) return;

      setStats(s);
      setStations(st);
      setAlerts(al);
      setParams(p);
      setGroups(g);
      setError(null);
    } catch (err) {
      if (!isMounted.current) return;
      setError("Falha ao atualizar dados. Tentando novamente em breve.");
      console.error("[DashboardContext] fetch error:", err);
    } finally {
      if (!isMounted.current) return;
      if (isFirstLoad.current) {
        setIsLoading(false);
        isFirstLoad.current = false;
      }
    }
  }, []);

  const refresh = useCallback(() => {
    fetchAll();
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(fetchAll, POLL_INTERVAL_MS);
  }, [fetchAll]);

  useEffect(() => {
    isMounted.current = true;
    fetchAll();
    intervalRef.current = setInterval(fetchAll, POLL_INTERVAL_MS);

    return () => {
      isMounted.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchAll]);

  return (
    <DashboardContext.Provider
      value={{
        stats,
        stations,
        alerts,
        params,
        groups,
        isLoading,
        error,
        refresh,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard(): DashboardContextValue {
  const ctx = useContext(DashboardContext);
  if (!ctx)
    throw new Error("useDashboard deve ser usado dentro de DashboardProvider");
  return ctx;
}
