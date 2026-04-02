import type { Station } from "@/types/station";

export type Grouping = {
  id: number;
  name: string;
};

export type StationGrouping = {
  id: number;
  id_grouping: number;
  id_station: number;
};


export type GroupingWithStations = Grouping & {
  station_groupings: { id_station: number }[];
};


export type GroupingWithStationDetails = Grouping & {
  station_groupings: {
    stations: Pick<Station, "id" | "name">[];
  }[];
};

export type StationGroupingWithGrouping = StationGrouping & {
  groupings: Grouping;
};