import type { AlertSeverity } from "@/types/alert";

const COLORS: Record<AlertSeverity, string> = {
  CRITICAL: "bg-alert",
  MODERATE: "bg-yellow-400",
  MINOR: "bg-primary",
};

export function SeverityDot({ severity }: { severity: AlertSeverity }) {
  return (
    <span
      className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${COLORS[severity]}`}
    />
  );
}
