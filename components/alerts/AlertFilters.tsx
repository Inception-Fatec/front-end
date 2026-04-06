import { Search } from "lucide-react";
import type { ParameterType } from "@/types/parameter";

interface AlertFiltersProps {
  search: string;
  parameterTypeFilter: number;
  parameterTypes: ParameterType[];
  severityFilter: string;
  onSeverityFilter: (v: string) => void;
  onSearch: (v: string) => void;
  onParameterTypeFilter: (v: number) => void;
}

export function AlertFilters({
  search,
  parameterTypeFilter,
  parameterTypes,
  severityFilter,
  onSearch,
  onParameterTypeFilter,
  onSeverityFilter
}: AlertFiltersProps) {

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text"
        />
        <input
          type="text"
          placeholder="Buscar alertas pelo nome..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-lg bg-card-background border border-border text-sm text-foreground placeholder:text-secondary-text focus:outline-none focus:border-primary transition-colors"
        />
      </div>
      <select
        value={parameterTypeFilter}
        onChange={(e) => onParameterTypeFilter(Number(e.target.value))}
        className="px-3 py-2 rounded-lg bg-card-background border border-border text-sm text-secondary-text focus:outline-none focus:border-primary transition-colors"
      >
        <option value="0">Todos os tipos de parâmetro</option>
        {parameterTypes.map((type) => (
          <option key={type.id} value={type.id}>
            {type.name} - {type.symbol}
          </option>
        ))}
      </select>
      <select
        value={severityFilter}
        onChange={(e) => onSeverityFilter(e.target.value)}
        className="px-3 py-2 rounded-lg bg-card-background border border-border text-sm text-secondary-text focus:outline-none focus:border-primary transition-colors"
      >
        <option value="">Todas as severidades</option>
        <option value="CRITICAL">Crítico</option>
        <option value="MODERATE">Moderado</option>
        <option value="MINOR">Simples</option>
      </select>
    </div>
  );
}
