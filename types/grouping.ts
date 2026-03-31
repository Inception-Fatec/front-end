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
  station_groupings: StationGrouping[];
};

export type StationGroupingWithGrouping = StationGrouping & {
  groupings: Grouping;
};