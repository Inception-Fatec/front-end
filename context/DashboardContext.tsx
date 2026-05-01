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
  getGroups,
  getParameterSummaries,
} from "@/services/dashboard";
import type { DashboardStats, ParameterSummary } from "@/types/dashboard";
import type { GroupingWithStationDetails } from "@/types/grouping";
import { getAlertLogs } from "@/services/alert-logs";
import { getStations } from "@/services/stations";
import { AlertLogWithDetails, PaginatedAlertLogs } from "@/types/alert";
import { PaginatedStations } from "@/types/station";
import { supabase } from "@/lib/supabaseClient";

const POLL_INTERVAL_MS = 60_000;

interface DashboardContextValue {
  stats: DashboardStats | null;
  stations: PaginatedStations;
  alerts: AlertLogWithDetails[];
  notifications: PaginatedAlertLogs;
  groups: GroupingWithStationDetails[];
  params: ParameterSummary[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [stations, setStations] = useState<PaginatedStations>({
    data: [],
    pagination: { page: 1, limit: 4, total: 0, totalPages: 0 },
  });
  const [alerts, setAlerts] = useState<AlertLogWithDetails[]>([]);
  const [notifications, setNotifications] = useState<PaginatedAlertLogs>({
    data: [],
    pagination: { page: 1, limit: 4, total: 0, totalPages: 0 },
  });
  const [groups, setGroups] = useState<GroupingWithStationDetails[]>([]);
  const [params, setParams] = useState<ParameterSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isFirstLoad = useRef(true);
  const isMounted = useRef(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAll = useCallback(async () => {
    if (isFirstLoad.current) setIsLoading(true);

    Promise.all([
      getDashboardStats(),
      getAlertLogs({ page: 1, limit: 4, all: true }),
      getAlertLogs({ page: 1, all: false }),
      getStations({ page: 1, limit: 4, search: "" }),
      getGroups(),
    ])
      .then(([s, al, n, st, g]) => {
        if (!isMounted.current) return;
        setStats(s);
        setAlerts(al.data);
        setNotifications(n);
        setStations(st);
        setGroups(g);
        setError(null);
        if (isFirstLoad.current) {
          setIsLoading(false);
          isFirstLoad.current = false;
        }
      })
      .catch((err) => {
        if (!isMounted.current) return;
        setError("Falha ao atualizar dados. Tentando novamente em breve.");
        console.error("[DashboardContext] fetch error (grupo 1):", err);
        if (isFirstLoad.current) {
          setIsLoading(false);
          isFirstLoad.current = false;
        }
      });

    Promise.all([getParameterSummaries()])
      .then(([p]) => {
        if (!isMounted.current) return;
        setParams(p);
      })
      .catch((err) => {
        console.error("[DashboardContext] fetch error (grupo 2):", err);
      });
  }, []);

  const refresh = useCallback(() => {
    fetchAll();
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(fetchAll, POLL_INTERVAL_MS);
  }, [fetchAll]);

  useEffect(() => {
    isMounted.current = true;

    const initialize = async () => {
      await fetchAll();
    };

    void initialize();
    intervalRef.current = setInterval(() => void fetchAll(), POLL_INTERVAL_MS);

    return () => {
      isMounted.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchAll]);

  useEffect(() => {
    const channel = supabase
      .channel("dashboard-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "alert_logs" },
        async () => {
          const [al, n] = await Promise.all([
            getAlertLogs({ page: 1, limit: 4, all: true }),
            getAlertLogs({ page: 1, all: false }),
          ]);
          if (isMounted.current) {
            setAlerts(al.data);
            setNotifications(n);
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stations" },
        async (payload) => {
          console.log("stations realtime:", payload);

          const [st, s] = await Promise.all([
            getStations({ page: 1, limit: 4, search: "" }),
            getDashboardStats(),
          ]);

          if (!isMounted.current) return;

          setStations(st);
          setStats(s);
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "measurements" },
        async (payload) => {
          console.log("measurements realtime:", payload);

          const s = await getDashboardStats();

          if (isMounted.current) setStats(s);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "groupings" },
        async () => {
          const s = await getDashboardStats();
          if (isMounted.current) setStats(s);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <DashboardContext.Provider
      value={{
        stats,
        stations,
        alerts,
        notifications,
        groups,
        params,
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
