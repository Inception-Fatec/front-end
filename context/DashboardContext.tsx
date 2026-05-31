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
import { Measurement } from "@/types/measurement";

interface DashboardContextValue {
  stats: DashboardStats | null;
  stations: PaginatedStations;
  alerts: AlertLogWithDetails[];
  notifications: PaginatedAlertLogs;
  notificationAlert: AlertLogWithDetails[] | null;
  groups: GroupingWithStationDetails[];
  params: ParameterSummary[];
  isLoading: boolean;
  error: string | null;
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
  const [notificationAlert, setNotificationAlert] = useState<
    AlertLogWithDetails[] | null
  >(null);
  const [groups, setGroups] = useState<GroupingWithStationDetails[]>([]);
  const [params, setParams] = useState<ParameterSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isFirstLoad = useRef(true);
  const isMounted = useRef(true);
  const reloadAlertsRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastReloadRef = useRef<number>(0);
  const alertsRef = useRef<AlertLogWithDetails[]>(alerts);

  const fetchAll = useCallback(async () => {
    if (isFirstLoad.current) setIsLoading(true);

    Promise.all([
      getDashboardStats(),
      getAlertLogs({ page: 1, limit: 4, all: true }),
      getAlertLogs({ page: 1, limit: 50, all: false }),
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

    getParameterSummaries()
      .then((p) => {
        if (!isMounted.current) return;
        setParams(p);
      })
      .catch((err) => {
        console.error("[DashboardContext] fetch error (grupo 2):", err);
      });
  }, []);

  useEffect(() => {
    isMounted.current = true;

    const initialize = async () => {
      await fetchAll();
    };

    void initialize();

    return () => {
      isMounted.current = false;
    };
  }, [fetchAll]);

  useEffect(() => {
    const channel = supabase
      .channel("dashboard-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "alert_logs" },
        () => {
          if (reloadAlertsRef.current) clearTimeout(reloadAlertsRef.current);

          const knownIds = new Set(alertsRef.current.map((a) => a.id));
          const delay = Date.now() - lastReloadRef.current >= 1000 ? 0 : 300;

          reloadAlertsRef.current = setTimeout(async () => {
            lastReloadRef.current = Date.now();

            const [al, n] = await Promise.all([
              getAlertLogs({ page: 1, limit: 4, all: true }),
              getAlertLogs({ page: 1, limit: 50, all: false }),
            ]);

            if (!isMounted.current) return;

            const newAlerts = al.data.filter((a) => !knownIds.has(a.id));

            setAlerts(al.data);
            setNotifications(n);

            if (newAlerts.length > 0) {
              setNotificationAlert(newAlerts);
            }
          }, delay);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "stations",
        },
        async (payload) => {
          const [st] = await Promise.all([
            getStations({ page: 1, limit: 4, search: "" }),
          ]);

          if (!isMounted.current) return;

          setStations(st);

          setStats((prev) => {
            if (!prev) return prev;

            let totalStations = prev.totalStations;
            let activeStations = prev.activeStations;

            if (payload.eventType === "INSERT") {
              totalStations += 1;

              if (payload.new.status === true) {
                activeStations += 1;
              }
            }

            if (payload.eventType === "DELETE") {
              totalStations -= 1;

              if (payload.old.status === true) {
                activeStations -= 1;
              }
            }

            if (payload.eventType === "UPDATE") {
              const oldStatus = payload.old.status;
              const newStatus = payload.new.status;

              if (oldStatus === true && newStatus === false) {
                activeStations -= 1;
              }

              if (oldStatus === false && newStatus === true) {
                activeStations += 1;
              }
            }

            return {
              ...prev,
              totalStations,
              activeStations,
            };
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "measurements" },
        (payload) => {
          if (!isMounted.current) return;

          const measurement = payload.new as Measurement;
          setStats((prev) => {
            if (!prev) return prev;

            return {
              ...prev,
              lastUpdate: measurement.date_time,
            };
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "groupings" },
        (payload) => {
          if (!isMounted.current) return;
          setStats((prev) => {
            if (!prev) return prev;

            let totalGroups = prev.totalGroups;

            if (payload.eventType === "INSERT") {
              totalGroups += 1;
            }

            if (payload.eventType === "DELETE") {
              totalGroups -= 1;
            }

            return {
              ...prev,
              totalGroups,
            };
          });
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
        notificationAlert,
        groups,
        params,
        isLoading,
        error,
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
