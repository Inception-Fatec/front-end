export type PeriodKey = "30min" | "1h" | "2h" | "3h";

export interface DashboardStats {
  totalStations: number;
  activeStations: number;
  totalGroups: number;
  lastUpdate: string;
}

export interface ParameterSummary {
  name: string;
  symbol: string;
  value: number;
  chartData: Record<PeriodKey, number[]>;
  color: string;
}