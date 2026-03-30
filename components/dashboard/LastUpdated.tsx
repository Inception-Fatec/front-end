"use client";

// components/dashboard/LastUpdated.tsx

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

export function LastUpdated({ onRefresh }: { onRefresh: () => void }) {
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    setSecondsAgo(0);
    const t = setInterval(() => setSecondsAgo((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const label =
    secondsAgo < 10
      ? "agora mesmo"
      : secondsAgo < 60
        ? `há ${secondsAgo}s`
        : `há ${Math.floor(secondsAgo / 60)}min`;

  return (
    <div className="flex items-center gap-2 text-[11px] text-secondary-text">
      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
      <span>Atualizado {label}</span>
      <button
        onClick={onRefresh}
        title="Atualizar agora"
        className="p-1 rounded hover:bg-card-background hover:text-foreground transition-colors"
      >
        <RefreshCw size={12} />
      </button>
    </div>
  );
}
