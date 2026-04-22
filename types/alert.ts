import { ParameterWithStationAndType } from "@/types/parameter";

export type AlertSeverity = "CRITICAL" | "MODERATE" | "MINOR";
export type AlertOperator = ">" | "<" | ">=" | "<=" | "=";

export type Alert = {
  id: number;
  name: string;
  message: string;
  severity: AlertSeverity;
  operator: AlertOperator;
  value: number;
  status: boolean;
  created_at: string;
};

export type AlertLog = {
  id: number;
  id_station: number;
  id_parameter: number;
  measurement: number;
  name: string;
  message: string;
  severity: AlertSeverity;
  operator: AlertOperator;
  value: number;
  created_at: string;
};

export type AlertParameter = {
  id: number;
  id_parameter: number;
  id_alert: number;
  parameters: ParameterWithStationAndType;
};

export type AlertWithParameters = Alert & {
  alert_parameters: AlertParameter[];
};

export type AlertLogWithDetails = AlertLog & {
  stations: {
    name: string;
  } | null;
  parameters: {
    id_parameter_type: number;
    parameter_types: {
      name: string;
      unit: string;
      symbol: string;
    };
  };
  user_alerts: {
    id_user: number;
    seen: boolean;
  } | null;
};

export type PaginatedAlerts = {
  data: AlertWithParameters[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type AlertPayload = {
  id?: number;
  name: string;
  message: string;
  severity: AlertSeverity;
  operator: AlertOperator;
  value: number;
  status: boolean;
  parameters: number[];
};

export type PaginatedAlertLogs = {
  data: AlertLogWithDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
