"use client";

import Highcharts from "highcharts/highstock";
import HighchartsReact from "highcharts-react-official";
import "highcharts/modules/exporting";
import "highcharts/modules/export-data";
import "highcharts/modules/offline-exporting";
import type { ParameterWithMeasurements } from "./types";

interface RainfallChartProps {
  parameters: ParameterWithMeasurements[];
  title: string;
}

function buildDailyRainfall(
  param: ParameterWithMeasurements,
): [number, number][] {
  const dayMap = new Map<string, number>();

  param.measurements.forEach((m) => {
    const day = m.date_time.slice(0, 10);
    const current = dayMap.get(day) ?? 0;
    dayMap.set(day, current + m.value);
  });

  return Array.from(dayMap.entries())
    .map(([day, total]): [number, number] => [
      new Date(day + "T00:00:00Z").getTime(),
      Number(total.toFixed(1)),
    ])
    .sort((a, b) => a[0] - b[0]);
}

const RAINFALL_KEYWORDS = [
  "chuva",
  "pluviométrico",
  "pluviometrico",
  "precipitação",
  "precipitacao",
];

export function RainfallChart({ parameters, title }: RainfallChartProps) {
  const rainParam = parameters.find((p) =>
    RAINFALL_KEYWORDS.some((kw) =>
      p.parameter_types.name.toLowerCase().includes(kw),
    ),
  );

  if (!rainParam) {
    return (
      <div className="bg-card-background border border-border rounded-xl p-4 flex items-center justify-center min-h-75">
        <p className="text-secondary-text italic text-sm">
          Nenhum parâmetro de chuva encontrado nos dados.
        </p>
      </div>
    );
  }

  const dailyData = buildDailyRainfall(rainParam);
  const unit = rainParam.parameter_types.unit;

  const options: Highcharts.Options = {
    chart: {
      type: "column",
      height: 400,
      backgroundColor: "transparent",
    },
    title: {
      text: `Volume de Chuva Diário — ${title}`,
      style: { color: "#FFF", fontSize: "14px" },
    },
    legend: { enabled: false },
    xAxis: {
      type: "datetime",
      labels: { style: { color: "#AAA" } },
    },
    yAxis: {
      min: 0,
      gridLineColor: "#333",
      labels: { style: { color: "#AAA" }, format: `{value} ${unit}` },
      title: { text: `Volume (${unit})`, style: { color: "#AAA" } },
    },
    tooltip: {
      valueDecimals: 1,
      valueSuffix: ` ${unit}`,
      backgroundColor: "#1e293b",
      style: { color: "#e2e8f0" },
    },
    plotOptions: {
      column: {
        color: "#1a8cff",
        borderWidth: 0,
        borderRadius: 2,
        pointPadding: 0.05,
        groupPadding: 0,
      },
    },
    series: [
      {
        type: "column",
        name: "Volume de Chuva",
        data: dailyData,
        showInLegend: false,
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
