import type { AlertSeverity } from "@/types/alert";

const CONFIG: Record<AlertSeverity, { label: string; cls: string }> = {
  CRITICAL: {
    label: "Crítico",
    cls: "bg-danger/15 text-danger border-danger/30",
  },
  MODERATE: {
    label: "Moderado",
    cls: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  },
  MINOR: {
    label: "Simples",
    cls: "bg-primary/15 text-primary border-primary/30",
  },
};

export function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  if (!severity || !CONFIG[severity]) return null;
  const { label, cls } = CONFIG[severity];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${cls}`}
    >
      {label}
    </span>
  );
}
