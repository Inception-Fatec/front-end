import { Search } from "lucide-react";
import type { ParameterType } from "@/types/parameter";

interface AlertLogFiltersProps {
    search: string;
    parameterTypeFilter: number;
    parameterTypes: ParameterType[];
    severityFilter: string;
    stationFilter: number;
    stations: { id: number; name: string }[];
    onSeverityFilter: (v: string) => void;
    onSearch: (v: string) => void;
    onParameterTypeFilter: (v: number) => void;
    onStationFilter: (v: number) => void;
}

export function AlertLogFilters({
    search,
    parameterTypeFilter,
    parameterTypes,
    severityFilter,
    stationFilter,
    stations,
    onSearch,
    onParameterTypeFilter,
    onSeverityFilter,
    onStationFilter,
}: AlertLogFiltersProps) {
    return (
        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
            <div className="relative w-full sm:flex-1 sm:min-w-48">
                <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text"
                />
                <input
                    type="text"
                    placeholder="Buscar pelo nome..."
                    value={search}
                    onChange={(e) => onSearch(e.target.value)}
                    className="w-full h-9 pl-9 pr-3 rounded-lg bg-card-background border border-border text-sm text-foreground placeholder:text-secondary-text focus:outline-none focus:border-primary transition-colors"
                />
            </div>

            <select
                value={stationFilter}
                onChange={(e) => onStationFilter(Number(e.target.value))}
                className="w-full sm:flex-1 sm:min-w-0 h-9 px-3 rounded-lg bg-card-background border border-border text-sm text-secondary-text focus:outline-none focus:border-primary transition-colors"
            >
                <option value="0">Todas as estações</option>
                {stations.map((station) => (
                    <option key={station.id} value={station.id}>
                        {station.name}
                    </option>
                ))}
            </select>

            <select
                value={parameterTypeFilter}
                onChange={(e) => onParameterTypeFilter(Number(e.target.value))}
                className="w-full sm:flex-1 sm:min-w-0 h-9 px-3 rounded-lg bg-card-background border border-border text-sm text-secondary-text focus:outline-none focus:border-primary transition-colors"
            >
                <option value="0">Todos os parâmetros</option>
                {parameterTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                        {type.unit} - {type.symbol}
                    </option>
                ))}
            </select>

            <select
                value={severityFilter}
                onChange={(e) => onSeverityFilter(e.target.value)}
                className="w-full sm:flex-1 sm:min-w-0 h-9 px-3 rounded-lg bg-card-background border border-border text-sm text-secondary-text focus:outline-none focus:border-primary transition-colors"
            >
                <option value="">Todas as severidades</option>
                <option value="CRITICAL">Crítico</option>
                <option value="MODERATE">Moderado</option>
                <option value="MINOR">Simples</option>
            </select>
        </div>
    );
}