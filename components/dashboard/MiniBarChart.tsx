interface MiniBarChartProps {
  data: number[];
  color: string; // hex — ex: "#f97316"
}

const MIN_OPACITY = 0.15;

export function MiniBarChart({ data, color }: MiniBarChartProps) {
  const max = Math.max(...data);
  const W = 10,
    G = 3,
    H = 40;

  return (
    <svg width={data.length * (W + G) - G} height={H} className="mt-3">
      {data.map((v, i) => {
        const ratio = max > 0 ? v / max : 0;
        const h = Math.max(ratio * H, 3); // mínimo 3px para barras zeradas serem visíveis
        const opacity = MIN_OPACITY + ratio * (1 - MIN_OPACITY);

        return (
          <rect
            key={i}
            x={i * (W + G)}
            y={H - h}
            width={W}
            height={h}
            rx={2}
            fill={color}
            opacity={opacity}
          />
        );
      })}
    </svg>
  );
}
