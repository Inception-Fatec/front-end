import { Parameter } from "@/types/parameter";

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

export type StationWithParameters = Station & {
  parameters: Parameter[];
};

export type CreateStation = Omit<Station, "id" | "created_at" | "last_measurement"> & {
  address?: string;
  latitude?: number;
  longitude?: number;
};

export type UpdateStation = Partial<Omit<Station, "id" | "created_at">> & {
  id: number;
};

export type StationWithGroupings = Station & {
  station_groupings: { id_grouping: number }[];
};

export type PaginatedStations = {
  data: StationWithParameters[];
  pagination: {
    page: number;
    limit: number | "all";
    total: number;
    totalPages: number;
  };
};