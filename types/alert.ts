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
  parameter_types: ParameterWithStationAndType;
};

export type AlertWithParameters = Alert & {
  alert_parameters: AlertParameter[];
};

export type AlertLogWithDetails = AlertLog & {
  stations: {
    name: string;
  };
  parameters: {
    id_parameter_type: number;
    parameter_type: {
      name: string;
      unit: string;
      symbol: string;
    };
  };
};