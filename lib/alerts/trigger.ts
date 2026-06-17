import type { AlertOperator, AlertSeverity } from "@/types/alert";

export type TriggerAlertRule = {
  id: number;
  name: string;
  message: string;
  severity: AlertSeverity;
  operator: AlertOperator;
  value: number;
  status: boolean;
};

export type TriggerMeasurement = {
  id_station: number;
  id_parameter: number;
  value: number;
};

export type TriggeredAlertLog = {
  id_alert: number;
  id_station: number;
  id_parameter: number;
  measurement: number;
  name: string;
  message: string;
  severity: AlertSeverity;
  operator: AlertOperator;
  value: number;
};

const SEVERITY_RANK: Record<AlertSeverity, number> = {
  MINOR: 1,
  MODERATE: 2,
  CRITICAL: 3,
};

export function isAlertConditionMet(
  measurement: number,
  operator: AlertOperator,
  threshold: number,
): boolean {
  switch (operator) {
    case ">":
      return measurement > threshold;
    case "<":
      return measurement < threshold;
    case ">=":
      return measurement >= threshold;
    case "<=":
      return measurement <= threshold;
    case "=":
      return measurement === threshold;
  }
}

export function buildTriggeredAlertLog(
  alert: TriggerAlertRule,
  measurement: TriggerMeasurement,
): TriggeredAlertLog | null {
  if (!alert.status) return null;
  if (!isAlertConditionMet(measurement.value, alert.operator, alert.value))
    return null;

  return {
    id_alert: alert.id,
    id_station: measurement.id_station,
    id_parameter: measurement.id_parameter,
    measurement: measurement.value,
    name: alert.name,
    message: alert.message,
    severity: alert.severity,
    operator: alert.operator,
    value: alert.value,
  };
}

export function resolveAlertStateTransition(
  current: AlertSeverity,
  next: AlertSeverity,
): {
  from: AlertSeverity;
  to: AlertSeverity;
  direction: "escalated" | "deescalated" | "unchanged";
} {
  const currentRank = SEVERITY_RANK[current];
  const nextRank = SEVERITY_RANK[next];

  return {
    from: current,
    to: next,
    direction:
      nextRank > currentRank
        ? "escalated"
        : nextRank < currentRank
          ? "deescalated"
          : "unchanged",
  };
}
