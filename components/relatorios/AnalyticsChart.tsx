"use client";

import { useMemo } from "react";
import Highcharts from "highcharts/highstock";
import HighchartsReact from "highcharts-react-official";
import type { ChartDataState, SeriesPoint } from "./types";
import "highcharts/modules/exporting";
import "highcharts/modules/export-data";
import "highcharts/modules/offline-exporting";

interface AnalyticsChartProps {
  chartData: ChartDataState | null;
  isLoading: boolean;
}

export function AnalyticsChart({ chartData, isLoading }: AnalyticsChartProps) {
  const chartSeries: Highcharts.SeriesLineOptions[] = useMemo(() => {
    if (!chartData?.parameters) return [];

    return chartData.parameters
      .map((param): Highcharts.SeriesLineOptions => {
        const isPressure = param.parameter_types.name
          .toLowerCase()
          .includes("pressão");

        const data: SeriesPoint[] = param.measurements
          .map((m): SeriesPoint => {
            const ts = new Date(m.date_time).getTime();
            if (isPressure) {
              return { x: ts, y: m.value / 1000, realValue: m.value };
            }
            return [ts, m.value];
          })
          .sort((a, b) => {
            const aTs = Array.isArray(a) ? a[0] : a.x;
            const bTs = Array.isArray(b) ? b[0] : b.x;
            return aTs - bTs;
          });

        return {
          type: "line",
          name: param.parameter_types.name,
          data: data as Highcharts.SeriesLineOptions["data"],
          showInLegend: true,
          tooltip: {
            valueSuffix: ` ${param.parameter_types.unit}`,
            pointFormat: isPressure
              ? '<span style="color:{series.color}">\u25CF</span> {series.name}: <b>{point.realValue:.1f}</b><br/>'
              : '<span style="color:{series.color}">\u25CF</span> {series.name}: <b>{point.y:.1f}</b><br/>',
          },
        };
      })
      .filter((s) => (s.data as SeriesPoint[]).length > 0);
  }, [chartData]);

  const options: Highcharts.Options = {
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
    chart: {
      height: 550,
      backgroundColor: "transparent",
      panning: { enabled: true, type: "x" },
      marginBottom: 120,
    },
    title: {
      text: chartData?.name ?? "Histórico de Medições",
      style: { color: "#FFF", fontSize: "16px" },
    },
    legend: {
      enabled: true,
      itemStyle: { color: "#CCC", fontWeight: "normal" },
      itemHoverStyle: { color: "#FFF" },
    },
    yAxis: {
      min: 0,
      gridLineColor: "#333",
      labels: { style: { color: "#AAA" } },
      title: { text: "Escala Ajustada", style: { color: "#AAA" } },
    },
    xAxis: {
      type: "datetime",
      labels: { style: { color: "#AAA" } },
    },
    plotOptions: {
      series: {
        dataGrouping: { enabled: true },
        marker: { enabled: false },
        showInLegend: true,
      },
    },
    navigator: { enabled: true },
    series: chartSeries,
    credits: { enabled: false },
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent animate-spin rounded-full" />
        <p className="text-primary font-bold italic text-sm">
          Buscando histórico...
        </p>
      </div>
    );
  }

  if (!chartData) {
    return (
      <p className="text-secondary-text italic text-sm text-center">
        Selecione uma estação ou grupo e o período desejado,
        <br />
        em seguida clique em Pesquisar.
      </p>
    );
  }

  return (
    <div className="w-full">
      <HighchartsReact
        highcharts={Highcharts}
        constructorType="stockChart"
        options={options}
      />
    </div>
  );
}
