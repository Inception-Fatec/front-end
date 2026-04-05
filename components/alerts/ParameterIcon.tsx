import {
  Thermometer,
  Droplets,
  Wind,
  CloudRain,
  Gauge,
  Sun,
  Zap,
  Eye,
  Mountain,
  Waves,
  Activity,
} from "lucide-react";

const PARAMETER_ICONS: Record<string, React.ElementType> = {
  temperatura: Thermometer,
  umidade: Droplets,
  vento: Wind,
  chuva: CloudRain,
  pressao: Gauge,
  radiacao: Sun,
  raios: Zap,
  visibilidade: Eye,
  altitude: Mountain,
  nivel: Waves,
};

const PARAMETER_COLORS: Record<string, string> = {
  temperatura: "#f97316",
  umidade:     "#3b82f6",
  vento:       "#32b841",
  chuva:       "#93c5fd",
  pressao:     "#b34bd9",
  radiacao:    "#eab308",
  raios:       "#fde047",
  visibilidade:"#9ca3af",
  altitude:    "#6b7280",
  nivel:       "#60a5fa",
};

const DEFAULT_COLOR = "#6366f1";

export function getParameterColor(name: string): string {
  const lower = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const [key, color] of Object.entries(PARAMETER_COLORS)) {
    if (lower.includes(key)) return color;
  }
  return DEFAULT_COLOR;
}

export function ParameterIcon({ name, size = 15 }: { name: string; size?: number }) {
  const lower = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const color = getParameterColor(name);
  for (const [key, Icon] of Object.entries(PARAMETER_ICONS)) {
    if (lower.includes(key)) return <Icon size={size} color={color} />;
  }
  return <Activity size={size} color={color} />;
}