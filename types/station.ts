import type { ParameterWithType } from "@/types/parameter";
import type { Alert } from "@/types/alert";

export type Station = {
  id: number;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  id_datalogger: string;
  last_measurement: string | null;
  created_at: string;
  status: boolean;
};

export type CreateStation = Omit<Station, "id" | "created_at" | "last_measurement" | "address" | "latitude" | "longitude"> & {
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type UpdateStation = Partial<Omit<Station, "id" | "created_at">> & {
  id: number;
};

export type StationWithGroupings = Station & {
  station_groupings: { id_grouping: number; groupings?: { name: string } }[];
};

export type StationWithDetails = StationWithGroupings & {
  parameters: (ParameterWithType & {
    alert_parameters: { alerts: Alert }[];
  })[];
};