import { Search } from "lucide-react";

interface StationFilterOption {
  id: number;
  name: string;
}

interface ParametersFiltersProps {
  search: string;
  stationFilter: string;
  stations: StationFilterOption[];
  onSearch: (v: string) => void;
  onStationFilter: (v: string) => void;
}

export function ParametersFilters({
  search,
  stationFilter,
  stations,
  onSearch,
  onStationFilter,
}: ParametersFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text"
        />
        <input
          type="text"
          placeholder="Buscar parâmetros por nome..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-lg bg-card-background border border-border text-sm text-foreground placeholder:text-secondary-text focus:outline-none focus:border-primary transition-colors"
        />
      </div>

      <select
        value={stationFilter}
        onChange={(e) => onStationFilter(e.target.value)}
        className="px-3 py-2 rounded-lg bg-card-background border border-border text-sm text-secondary-text focus:outline-none focus:border-primary transition-colors"
      >
        <option value="all">Todas as estações</option>
        {stations.map((station) => (
          <option key={station.id} value={String(station.id)}>
            {station.name}
          </option>
        ))}
      </select>
    </div>
  );
}
