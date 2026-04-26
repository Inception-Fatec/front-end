"use client";

import Highcharts from "highcharts/highstock";
import HighchartsReact from "highcharts-react-official";
import "highcharts/modules/exporting";
import "highcharts/modules/export-data";
import "highcharts/modules/offline-exporting";
import type { ParameterWithMeasurements } from "./types";

interface TempRangeChartProps {
  parameters: ParameterWithMeasurements[];
  title: string;
}

function buildDailyMinMax(
  param: ParameterWithMeasurements,
): { date: number; min: number; max: number }[] {
  const dayMap = new Map<string, { min: number; max: number }>();

  param.measurements.forEach((m) => {
    const day = m.date_time.slice(0, 10);
    const current = dayMap.get(day);
    if (!current) {
      dayMap.set(day, { min: m.value, max: m.value });
    } else {
      dayMap.set(day, {
        min: Math.min(current.min, m.value),
        max: Math.max(current.max, m.value),
      });
    }
  });

  return Array.from(dayMap.entries())
    .map(([day, { min, max }]) => ({
      date: new Date(day + "T00:00:00Z").getTime(),
      min: Number(min.toFixed(1)),
      max: Number(max.toFixed(1)),
    }))
    .sort((a, b) => a.date - b.date);
}

export function TempRangeChart({ parameters, title }: TempRangeChartProps) {
  const tempParam = parameters.find((p) =>
    p.parameter_types.name.toLowerCase().includes("temperatura"),
  );

  if (!tempParam) {
    return (
      <div className="bg-card-background border border-border rounded-xl p-4 flex items-center justify-center min-h-75">
        <p className="text-secondary-text italic text-sm">
          Nenhum parâmetro de temperatura encontrado nos dados.
        </p>
      </div>
    );
  }

  const dailyData = buildDailyMinMax(tempParam);
  const unit = tempParam.parameter_types.unit;

  const options: Highcharts.Options = {
    chart: {
      height: 400,
      backgroundColor: "transparent",
    },
    title: {
      text: `Temperatura Mín/Máx Diária — ${title}`,
      style: { color: "#FFF", fontSize: "14px" },
    },
    legend: {
      enabled: true,
      itemStyle: { color: "#CCC", fontWeight: "normal" },
      itemHoverStyle: { color: "#FFF" },
    },
    xAxis: {
      type: "datetime",
      labels: { style: { color: "#AAA" } },
    },
    yAxis: {
      gridLineColor: "#333",
      labels: { style: { color: "#AAA" }, format: `{value} ${unit}` },
      title: { text: `Temperatura (${unit})`, style: { color: "#AAA" } },
    },
    tooltip: {
      shared: true,
      valueDecimals: 1,
      valueSuffix: ` ${unit}`,
      backgroundColor: "#1e293b",
      style: { color: "#e2e8f0" },
    },
    series: [
      {
        type: "line",
        name: "Máxima",
        data: dailyData.map((d) => [d.date, d.max]),
        color: "#f97316",
        showInLegend: true,
      },
      {
        type: "line",
        name: "Mínima",
        data: dailyData.map((d) => [d.date, d.min]),
        color: "#3b82f6",
        showInLegend: true,
      },
    ],
    exporting: {
      enabled: true,
      fallbackToExportServer: false,
      buttons: {
        contextButton: {
          menuItems: [
            "downloadPNG",
            "downloadJPEG",
            "downloadPDF",
            "downloadSVG",
            "separator",
            "downloadCSV",
            "downloadXLS",
          ],
        },
      },
    },
    credits: { enabled: false },
  };

  return (
    <div className="bg-card-background border border-border rounded-xl p-4">
      <HighchartsReact highcharts={Highcharts} options={options} />
    </div>
  );
}
