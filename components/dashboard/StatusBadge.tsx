const CONFIG: Record<string, { label: string; cls: string; dot: string }> = {
  online: {
    label: "Online",
    cls: "bg-green-500/15 text-green-400 border-green-500/30",
    dot: "bg-green-400",
  },
  offline: {
    label: "Offline",
    cls: "bg-secondary-text/15 text-secondary-text border-secondary-text/30",
    dot: "bg-secondary-text",
  },
};

export function StatusBadge({ status }: { status: string }) {
  const { label, cls, dot } = CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${cls}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}