import type { RecentAlertSeverity } from "@/types/api";

const COLORS: Record<RecentAlertSeverity, string> = {
  critical: "bg-alert",
  warning: "bg-yellow-400",
  info: "bg-primary",
};

export function SeverityDot({ severity }: { severity: RecentAlertSeverity }) {
  return (
    <span
      className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${COLORS[severity]}`}
    />
  );
}
