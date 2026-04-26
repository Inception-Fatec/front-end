"use client";

interface AnalyticsFiltersProps {
  stations: { id: number; name: string }[];
  groups: { id: number; name: string }[];
  stationId: number | null;
  groupId: number | null;
  startDate: string;
  endDate: string;
  isLoading: boolean;
  onStationChange: (id: number | null) => void;
  onGroupChange: (id: number | null) => void;
  onStartDateChange: (v: string) => void;
  onEndDateChange: (v: string) => void;
  onPreset: (period: "1w" | "1m" | "3m" | "1y") => void;
  onSearch: () => void;
  dateError: string | null;
  setDateError: (v: string | null) => void;
}

const PRESETS = ["1w", "1m", "3m", "1y"] as const;

export function AnalyticsFilters({
  stations,
  groups,
  stationId,
  groupId,
  startDate,
  endDate,
  isLoading,
  onStationChange,
  onGroupChange,
  onStartDateChange,
  onEndDateChange,
  onPreset,
  onSearch,
  dateError,
  setDateError,
}: AnalyticsFiltersProps) {
  function maxDate() {
    const agora = new Date();
    const dia = String(agora.getDate()).padStart(2, "0");
    const mes = String(agora.getMonth() + 1).padStart(2, "0");
    const ano = agora.getFullYear();
    return `${ano}-${mes}-${dia}`;
  }

  const handleDateValidation = (value: string, type: "start" | "end") => {
    const today = maxDate();
    let currentError = null;

    if (type === "start") {
      if (endDate && value > endDate) {
        currentError = "Data inicial não pode ser maior que a final.";
      } else if (value > today) {
        currentError = "A data não pode ser futura.";
      }
      onStartDateChange(value);
    } else {
      if (startDate && value < startDate) {
        currentError = "Data final não pode ser menor que a inicial.";
      } else if (value > today) {
        currentError = "A data não pode ser futura.";
      }
      onEndDateChange(value);
    }

    setDateError(currentError);
  };

  const canSearch = (stationId !== null || groupId !== null) && !dateError;
  console.log(dateError);
  return (
    <div className="bg-card-background border justify-center border-border p-4 rounded-xl flex flex-wrap gap-4 items-end">
      {/* Estação / Grupo */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-center text-secondary-text uppercase font-bold">
          Estação / Grupo
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={stationId ?? ""}
            onChange={(e) => {
              onGroupChange(null);
              onStationChange(
                e.target.value === "" ? null : Number(e.target.value),
              );
            }}
            className="text-xs w-auto px-3 py-2 rounded-lg bg-background border border-border text-white outline-none focus:border-primary"
          >
            <option value="">Selecione uma estação</option>
            {stations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            value={groupId ?? ""}
            onChange={(e) => {
              onStationChange(null);
              onGroupChange(
                e.target.value === "" ? null : Number(e.target.value),
              );
            }}
            className="text-xs px-3 py-2 rounded-lg bg-background border border-border text-white outline-none focus:border-primary"
          >
            <option value="">Selecione um grupo</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Intervalo de datas */}
      <div className="flex flex-col gap-1 pb-4.5 relative">
        <label className="text-[10px] text-center text-secondary-text uppercase font-bold">
          Intervalo de Datas
        </label>
        <div className="flex gap-2">
          <input
            type="date"
            max={endDate !== "" ? endDate : maxDate()}
            value={startDate}
            onChange={(e) => handleDateValidation(e.target.value, "start")}
            className={`text-xs px-3 py-2 rounded-lg bg-background border border-border text-white outline-none 
             [&::-webkit-calendar-picker-indicator]:invert 
             [&::-webkit-calendar-picker-indicator]:opacity-50 
             hover:[&::-webkit-calendar-picker-indicator]:opacity-100
             ${
               dateError && (startDate > endDate || startDate > maxDate())
                 ? "border-red-500 shadow-[0_0_5px_rgba(239,68,68,0.2)]"
                 : "border-border focus:border-primary"
             }
             `}
          />
          <input
            type="date"
            max={maxDate()}
            min={startDate}
            value={endDate}
            onChange={(e) => handleDateValidation(e.target.value, "end")}
            className={`text-xs px-3 py-2 rounded-lg bg-background border border-border text-white outline-none 
             [&::-webkit-calendar-picker-indicator]:invert 
             [&::-webkit-calendar-picker-indicator]:opacity-50 
             hover:[&::-webkit-calendar-picker-indicator]:opacity-100
             ${
               dateError && (startDate > endDate || startDate > maxDate())
                 ? "border-red-500 shadow-[0_0_5px_rgba(239,68,68,0.2)]"
                 : "border-border focus:border-primary"
             }
             `}
          />
        </div>
        {/* Mensagem de Erro */}
        {dateError && (
          <span className="text-[9px] text-red-500 font-bold animate-in fade-in slide-in-from-top-1 absolute bottom-0 left-0">
            {dateError}
          </span>
        )}
      </div>

      {/* Atalhos de período */}
      <div className="flex flex-col gap-1 pb-4.5 relative">
        <label className="text-[10px] text-center text-secondary-text uppercase font-bold">
          Atalhos
        </label>
        <div className="flex gap-1">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => onPreset(p)}
              className="text-[10px] px-2 py-2 bg-background border border-border rounded hover:bg-border text-white uppercase transition-colors"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Botão pesquisar */}
      <button
        onClick={onSearch}
        disabled={isLoading || !canSearch}
        className="px-8 py-2 bg-primary text-black font-bold rounded-lg text-xs disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-110 active:scale-95 transition-all mb-4.5 relative"
      >
        {isLoading ? "CARREGANDO..." : "PESQUISAR"}
      </button>
    </div>
  );
}
