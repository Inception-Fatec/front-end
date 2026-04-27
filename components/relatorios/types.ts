import type { ParameterWithType } from "@/types/parameter";

export interface Measurement {
  id: number;
  value: number;
  date_time: string;
}

export interface ParameterWithMeasurements extends ParameterWithType {
  measurements: Measurement[];
  isAggregated?: boolean;
}

export interface ChartDataState {
  name: string;
  parameters: ParameterWithMeasurements[];
}

export interface PressurePoint {
  x: number;
  y: number;
  realValue: number;
}

export type SeriesPoint = [number, number] | PressurePoint;
