"use client";

import { CircleAlert, Info } from "lucide-react";
import { AlertSeverity } from "@/types/alert";
import { useEffect, useRef, useState } from "react";

type Props = {
  severity: AlertSeverity;
  title: string;
  station: string;
  message: string;
  value: string;
  onClose?: () => void;
};

export default function Toast({
  severity,
  title,
  station,
  message,
  value,
  onClose,
}: Props) {
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(100);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (paused) return;

    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          onClose?.();
          return 0;
        }
        return prev - 2;
      });
    }, 100);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [paused, onClose]);

  function getToastStyle() {
    switch (severity) {
      case "CRITICAL":
        return {
          border: "border-red-500/40",
          progress: "bg-red-500",
          icon: <CircleAlert size={16} className="text-red-500" />,
        };
      case "MODERATE":
        return {
          border: "border-yellow-500/40",
          progress: "bg-yellow-500",
          icon: <CircleAlert size={16} className="text-yellow-500" />,
        };
      case "MINOR":
        return {
          border: "border-blue-500/40",
          progress: "bg-blue-500",
          icon: <CircleAlert size={16} className="text-blue-500" />,
        };
      default:
        return {
          border: "border-primary",
          progress: "bg-primary",
          icon: <Info size={16} className="text-primary" />,
        };
    }
  }

  const style = getToastStyle();

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className={`
        pointer-events-auto
        relative
        overflow-hidden
        flex items-start gap-3
        rounded-xl border
        ${style.border}
        bg-card-background
        p-3
        shadow-lg
        w-[280px]
        backdrop-blur-md
      `}
    >
      {style.icon}

      <div className="flex-1 min-w-0">
        <h2 className="font-semibold text-foreground text-sm truncate">
          {title}
        </h2>
        <p className="text-[11px] text-secondary-text truncate">{station}</p>
        <p className="text-xs text-foreground mt-1 line-clamp-1">{message}</p>
        <p className="text-xs text-primary mt-1 font-medium">{value}</p>
      </div>

      <div className="absolute bottom-0 left-0 h-[3px] w-full bg-white/5">
        <div
          className={`h-full ${style.progress}`}
          style={{
            width: `${progress}%`,
            transition: paused ? "none" : "width 100ms linear",
          }}
        />
      </div>
    </div>
  );
}
