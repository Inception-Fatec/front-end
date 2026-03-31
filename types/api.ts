export type UserRole = "ADMIN" | "OPERATOR" | "USER";

// ─── Tabelas do banco ─────────────────────────────────────────────────────────

export interface Station {
  id: number;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  id_datalogger: string;
  last_measurement: string | null; // novo campo no banco
  created_at: string;
  status: boolean;
}

export interface ParameterType {
  id: number;
  name: string;
  unit: string;
  symbol: string;
  factor_value: number;
  offset_value: number;
  json_name: string;
}

export interface Parameter {
  id: number;
  id_station: number;
  id_parameter_type: number;
  station?: Station;
  parameter_type?: ParameterType;
}

export interface Measurement {
  id: number;
  id_parameter: number;
  value: number;
  date_time: string;
  parameter?: Parameter;
}

// severity agora vem do banco com esses valores exatos
export type AlertSeverity = "CRITICAL" | "MODERATE" | "MINOR";

export interface Alert {
  id: number;
  name: string; // novo campo
  message: string;
  severity: AlertSeverity; // novo campo — antes não existia na tabela alerts
  operator: ">" | "<" | ">=" | "<=" | "=";
  value: number;
  status: boolean;
}

// tabela nova — N:N entre alerts e parameters
export interface AlertParameter {
  id: number;
  id_parameter: number;
  id_alert: number;
  parameter?: Parameter;
  alert?: Alert;
}

export interface AlertLog {
  id: number;
  id_station: number;
  id_parameter: number;
  measurement: number;
  message: string;
  operator: ">" | "<" | ">=" | "<=" | "=";
  value: number;
  created_at: string;
  station?: Station;
  parameter?: Parameter;
}

export interface UserAlert {
  id_user: number;
  id_alert_log: number;
  seen: boolean;
  alert_log?: AlertLog;
}

export interface Grouping {
  id: number;
  name: string;
}

export interface StationGrouping {
  id: number;
  id_grouping: number;
  id_station: number;
  grouping?: Grouping;
  station?: Station;
}

// ─── Shapes consumidos pelos componentes ─────────────────────────────────────

export interface DashboardStats {
  totalStations: number;
  activeStations: number;
  activeAlerts: number; // contagem de alert_logs com seen = false
  lastUpdateSeconds: number; // segundos desde o last_measurement mais recente
}

export interface StationRow {
  id: number;
  name: string;
  location: string; // address ou coordenadas formatadas
  status: "online" | "alert" | "offline";
  lastComm: string; // last_measurement formatado para exibição
  temperature: number | null;
  humidity: number | null;
}

// severity mapeada do banco (CRITICAL→critical, MODERATE→warning, MINOR→info)
export type RecentAlertSeverity = "critical" | "warning" | "info";

export interface RecentAlert {
  id: number;
  stationName: string;
  parameterName: string; // ex: "Temperatura Crítica"
  message: string; // ex: "Valor: 41.2°C"
  timeAgo: string;
  severity: RecentAlertSeverity;
  seen: boolean; // controla ponto azul de não lido
}

// Opções de período disponíveis no filtro do dashboard
export type PeriodKey = "30min" | "1h" | "2h" | "3h";

export interface PeriodOption {
  key: PeriodKey;
  label: string;
}

export interface GroupOption {
  id: number;
  name: string;
}

export interface ParameterSummary {
  name: string;
  unit: string;
  // Média geral (todas as estações) — exibida quando nenhum grupo está selecionado
  value: number;
  // Média por grupo — chave é o groupId, valor é a média das estações daquele grupo
  valueByGroup: Record<number, number>;
  // chartData indexado por período — o componente escolhe qual exibir
  chartData: Record<PeriodKey, number[]>;
  color: string;
  // grupos aos quais este parâmetro pertence (via station_groupings)
  groupIds: number[];
}
