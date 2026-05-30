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
import { Measurement } from "@/types/measurement";

interface DashboardContextValue {
  stats: DashboardStats | null;
  stations: PaginatedStations;
  alerts: AlertLogWithDetails[];
  notifications: PaginatedAlertLogs;
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
  const [groups, setGroups] = useState<GroupingWithStationDetails[]>([]);
  const [params, setParams] = useState<ParameterSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isFirstLoad = useRef(true);
  const isMounted = useRef(true);

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
    void fetchAll();
    return () => {
      isMounted.current = false;
    };
  }, [fetchAll]);

  useEffect(() => {
    let es: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      es = new EventSource("/api/events");

      es.onmessage = async (event) => {
        if (!isMounted.current) return;

        let parsed: {
          channel: string;
          payload: Record<string, unknown> | null;
        };
        try {
          parsed = JSON.parse(event.data);
        } catch {
          return;
        }

        const { channel, payload } = parsed;

        if (channel === "alert_logs_channel") {
          const [al, n] = await Promise.all([
            getAlertLogs({ page: 1, limit: 4, all: true }),
            getAlertLogs({ page: 1, limit: 50, all: false }),
          ]);
          if (isMounted.current) {
            setAlerts(al.data);
            setNotifications(n);
          }
        }

        if (channel === "stations_channel") {
          const st = await getStations({ page: 1, limit: 4, search: "" });
          if (!isMounted.current) return;
          setStations(st);

          if (payload) {
            setStats((prev) => {
              if (!prev) return prev;
              let { totalStations, activeStations } = prev;

              if (payload.eventType === "INSERT") {
                totalStations += 1;
                if (payload.status === true) activeStations += 1;
              }
              if (payload.eventType === "DELETE") {
                totalStations -= 1;
                if (payload.old_status === true) activeStations -= 1;
              }
              if (payload.eventType === "UPDATE") {
                if (payload.old_status === true && payload.status === false)
                  activeStations -= 1;
                if (payload.old_status === false && payload.status === true)
                  activeStations += 1;
              }

              return { ...prev, totalStations, activeStations };
            });
          }
        }

        if (channel === "measurements_channel" && payload) {
          
          setStats((prev) => {
            if (!prev) return prev;
            return { ...prev, lastUpdate: new Date().toISOString() };
          });
        }

        if (channel === "groupings_channel" && payload) {
          setStats((prev) => {
            if (!prev) return prev;
            let { totalGroups } = prev;
            if (payload.eventType === "INSERT") totalGroups += 1;
            if (payload.eventType === "DELETE") totalGroups -= 1;
            return { ...prev, totalGroups };
          });
        }
      };

      es.onerror = () => {
        es?.close();
        // Reconecta após 5s em caso de erro
        reconnectTimeout = setTimeout(connect, 5_000);
      };
    }

    connect();

    return () => {
      es?.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
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
