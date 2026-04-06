import type {
  DashboardStats,
  StationRow,
  RecentAlert,
  RecentAlertSeverity,
  ParameterSummary,
  AlertSeverity,
  GroupOption,
} from "@/types/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapSeverity(severity: AlertSeverity): RecentAlertSeverity {
  const map: Record<AlertSeverity, RecentAlertSeverity> = {
    CRITICAL: "critical",
    MODERATE: "warning",
    MINOR: "info",
  };
  return map[severity];
}

function timeAgo(isoDate: string): string {
  const diff = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
  if (diff < 60) return `Há ${diff}s`;
  if (diff < 3600) return `Há ${Math.floor(diff / 60)} min`;
  return `Há ${Math.floor(diff / 3600)}h`;
}

const now = new Date();
const mins = (m: number) => new Date(now.getTime() - m * 60_000).toISOString();

const MOCK_STATS: DashboardStats = {
  totalStations: 13,
  activeStations: 9,
  activeAlerts: 3,
  lastUpdateSeconds: 134,
};

const MOCK_STATIONS: StationRow[] = [
  {
    id: 4,
    name: "Estação Curitiba-04",
    location: "Paraná, PR",
    status: "alert",
    lastComm: timeAgo(mins(2)),
    temperature: 24.5,
    humidity: 98,
  },
  {
    id: 12,
    name: "Estação Manaus-12",
    location: "Amazonas, AM",
    status: "online",
    lastComm: timeAgo(mins(14)),
    temperature: 31.2,
    humidity: 82,
  },
  {
    id: 1,
    name: "Estação Recife-01",
    location: "Pernambuco, PE",
    status: "online",
    lastComm: timeAgo(mins(45)),
    temperature: 28.0,
    humidity: 65,
  },
  {
    id: 2,
    name: "Estação Brasília-02",
    location: "Distrito Federal",
    status: "offline",
    lastComm: timeAgo(mins(60)),
    temperature: null,
    humidity: null,
  },
  {
    id: 5,
    name: "Estação São Paulo-05",
    location: "São Paulo, SP",
    status: "online",
    lastComm: timeAgo(mins(3)),
    temperature: 22.1,
    humidity: 74,
  },
  {
    id: 6,
    name: "Estação Salvador-06",
    location: "Bahia, BA",
    status: "online",
    lastComm: timeAgo(mins(8)),
    temperature: 30.4,
    humidity: 88,
  },
  {
    id: 7,
    name: "Estação Fortaleza-07",
    location: "Ceará, CE",
    status: "alert",
    lastComm: timeAgo(mins(1)),
    temperature: 33.7,
    humidity: 91,
  },
  {
    id: 8,
    name: "Estação Porto Alegre-08",
    location: "Rio Grande do Sul, RS",
    status: "online",
    lastComm: timeAgo(mins(20)),
    temperature: 18.3,
    humidity: 60,
  },
  {
    id: 9,
    name: "Estação Belém-09",
    location: "Pará, PA",
    status: "online",
    lastComm: timeAgo(mins(11)),
    temperature: 29.8,
    humidity: 95,
  },
  {
    id: 10,
    name: "Estação Campo Grande-10",
    location: "Mato Grosso do Sul, MS",
    status: "offline",
    lastComm: timeAgo(mins(180)),
    temperature: null,
    humidity: null,
  },
  {
    id: 11,
    name: "Estação Goiânia-11",
    location: "Goiás, GO",
    status: "online",
    lastComm: timeAgo(mins(5)),
    temperature: 26.5,
    humidity: 68,
  },
  {
    id: 13,
    name: "Estação Florianópolis-13",
    location: "Santa Catarina, SC",
    status: "online",
    lastComm: timeAgo(mins(33)),
    temperature: 21.0,
    humidity: 77,
  },
  {
    id: 14,
    name: "Estação Natal-14",
    location: "Rio Grande do Norte, RN",
    status: "offline",
    lastComm: timeAgo(mins(240)),
    temperature: null,
    humidity: null,
  },
];

const MOCK_ALERTS: RecentAlert[] = [
  {
    id: 1,
    stationName: "Estação Curitiba-04",
    parameterName: "Temperatura Crítica",
    message: "Valor: 41.2°C",
    timeAgo: timeAgo(mins(2)),
    severity: mapSeverity("CRITICAL"),
    seen: false,
  },
  {
    id: 2,
    stationName: "Estação Manaus-12",
    parameterName: "Vel. do Vento Alta",
    message: "Valor: 94 km/h",
    timeAgo: timeAgo(mins(14)),
    severity: mapSeverity("CRITICAL"),
    seen: false,
  },
  {
    id: 3,
    stationName: "Estação Recife-01",
    parameterName: "Umidade Baixa",
    message: "Valor: 18%",
    timeAgo: timeAgo(mins(42)),
    severity: mapSeverity("MODERATE"),
    seen: false,
  },
  {
    id: 4,
    stationName: "Estação Brasília-02",
    parameterName: "Pressão Atmosférica",
    message: "Valor: 979 hPa",
    timeAgo: timeAgo(mins(120)),
    severity: mapSeverity("MINOR"),
    seen: true,
  },
];

const MOCK_PARAMS: ParameterSummary[] = [
  {
    name: "TEMPERATURA",
    value: 24.5,
    unit: "°C",
    color: "#f97316",
    groupIds: [1, 2, 3],
    valueByGroup: { 1: 21.4, 2: 31.8, 3: 25.2 },
    chartData: {
      "30min": [24.1, 24.3, 24.0, 24.4, 24.5, 24.2, 24.6, 24.5],
      "1h": [23.8, 24.0, 24.2, 24.1, 24.4, 24.3, 24.6, 24.5],
      "2h": [23.0, 23.5, 23.8, 24.0, 24.2, 24.3, 24.4, 24.5],
      "3h": [22.0, 22.5, 23.0, 23.5, 24.0, 24.2, 24.4, 24.5],
    },
  },
  {
    name: "UMIDADE",
    value: 62,
    unit: "%",
    color: "#3b82f6",
    groupIds: [1, 3],
    valueByGroup: { 1: 68.5, 3: 55.0 },
    chartData: {
      "30min": [61, 62, 61, 63, 62, 61, 62, 62],
      "1h": [60, 61, 62, 61, 63, 62, 61, 62],
      "2h": [58, 59, 60, 61, 62, 62, 63, 62],
      "3h": [55, 57, 58, 60, 61, 62, 63, 62],
    },
  },
  {
    name: "PRESSÃO",
    value: 1013,
    unit: "hPa",
    color: "#8b5cf6",
    groupIds: [1, 2],
    valueByGroup: { 1: 1015.0, 2: 1009.5 },
    chartData: {
      "30min": [1013, 1013, 1012, 1013, 1013, 1014, 1013, 1013],
      "1h": [1012, 1013, 1013, 1012, 1013, 1014, 1013, 1013],
      "2h": [1011, 1012, 1012, 1013, 1013, 1013, 1014, 1013],
      "3h": [1010, 1011, 1011, 1012, 1012, 1013, 1013, 1013],
    },
  },
  {
    name: "VENTO",
    value: 12.8,
    unit: "km/h",
    color: "#14b8a6",
    groupIds: [2, 3],
    valueByGroup: { 2: 18.2, 3: 9.4 },
    chartData: {
      "30min": [12.0, 12.5, 12.8, 12.6, 13.0, 12.7, 12.9, 12.8],
      "1h": [11.0, 11.5, 12.0, 12.3, 12.5, 12.7, 12.8, 12.8],
      "2h": [9.0, 10.0, 10.5, 11.0, 11.5, 12.0, 12.5, 12.8],
      "3h": [8.0, 8.5, 9.0, 9.5, 10.5, 11.5, 12.0, 12.8],
    },
  },
  {
    name: "CHUVA",
    value: 4.2,
    unit: "mm",
    color: "#1a8cff",
    groupIds: [1, 2, 3],
    valueByGroup: { 1: 6.1, 2: 2.3, 3: 4.8 },
    chartData: {
      "30min": [3.8, 4.0, 4.0, 4.1, 4.1, 4.2, 4.2, 4.2],
      "1h": [3.0, 3.2, 3.5, 3.8, 4.0, 4.1, 4.2, 4.2],
      "2h": [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.2],
      "3h": [0.0, 0.5, 1.0, 1.5, 2.0, 3.0, 3.8, 4.2],
    },
  },
];

export const MOCK_GROUPS: GroupOption[] = [
  { id: 1, name: "Sul" },
  { id: 2, name: "Norte" },
  { id: 3, name: "Centro-Oeste" },
];

// ─── Service ──────────────────────────────────────────────────────────────────

export async function getDashboardStats(): Promise<DashboardStats> {
  await new Promise((r) => setTimeout(r, 300));
  return MOCK_STATS;
}

export async function getStationRows(limit = 4): Promise<StationRow[]> {
  await new Promise((r) => setTimeout(r, 300));
  return MOCK_STATIONS;
}

export async function getRecentAlerts(limit = 4): Promise<RecentAlert[]> {
  await new Promise((r) => setTimeout(r, 300));
  return MOCK_ALERTS.slice(0, limit);
}

export async function getParameterSummaries(): Promise<ParameterSummary[]> {
  await new Promise((r) => setTimeout(r, 300));
  return MOCK_PARAMS;
}

export async function getGroups(): Promise<GroupOption[]> {
  // TODO: fetch("/api/groupings").then(r => r.json())
  await new Promise((r) => setTimeout(r, 300));
  return MOCK_GROUPS;
}
