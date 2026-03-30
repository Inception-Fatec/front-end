import {
  Thermometer,
  Droplets,
  Gauge,
  Wind,
  CloudRain,
  BarChart2,
} from "lucide-react";

const ICONS: Record<string, React.ReactNode> = {
  TEMPERATURA: <Thermometer size={15} />,
  UMIDADE: <Droplets size={15} />,
  PRESSÃO: <Gauge size={15} />,
  VENTO: <Wind size={15} />,
  CHUVA: <CloudRain size={15} />,
};

export function ParamIcon({ name }: { name: string }) {
  return <>{ICONS[name] ?? <BarChart2 size={15} />}</>;
}
