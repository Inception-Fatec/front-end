interface StatCardProps {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  valueColor?: string;
}

export function StatCard({
  label,
  value,
  sub,
  icon,
  valueColor,
}: StatCardProps) {
  return (
    <div className="bg-card-background border border-border rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary-text">
          {label}
        </p>
        <span className="text-secondary-text">{icon}</span>
      </div>
      <p
        className={`text-3xl font-bold transition-all duration-500 ${valueColor ?? "text-foreground"}`}
      >
        {value}
      </p>
      <p className="text-xs text-secondary-text">{sub}</p>
    </div>
  );
}
