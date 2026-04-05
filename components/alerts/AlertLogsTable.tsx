"use client";

import { useState, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SeverityBadge } from "./SeverityBadge";
import type { PaginatedAlertLogs } from "@/types/alert";
import type { ParameterType } from "@/types/parameter";
import { getAlertLogs } from "@/services/alert-logs";
import { getParameters } from "@/services/parameters";
import { getStations } from "@/services/stations";
import { StationWithParameters } from "@/types/station";
import { AlertLogFilters } from "./AlertLogFilters";
import { ParameterIcon } from "./ParameterIcon";

export function AlertLogsTable() {
    const [search, setSearch] = useState("");
    const [limit] = useState(8);
    const [parameterTypeFilter, setParameterTypeFilter] = useState(0);
    const [parameterTypes, setParameterTypes] = useState<ParameterType[]>([]);
    const [severityFilter, setSeverityFilter] = useState("");
    const [stations, setStations] = useState<StationWithParameters[]>([]);
    const [stationFilter, setStationFilter] = useState(0);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<PaginatedAlertLogs>({
        data: [],
        pagination: { page: 1, limit, totalPages: 1, total: 0 },
    });

    const fetchPage = useCallback(
        async (
            page: number, l = limit, s = search, p = parameterTypeFilter, se = severityFilter, st = stationFilter, all = true
        ) => {
            setLoading(true);
            try {
                const result = await getAlertLogs({
                    page, limit: l, search: s, parameterType: p, severity: se, station: st, all: all
                });
                setData(result);
            } finally {
                setLoading(false);
            }
        },
        [limit, search, parameterTypeFilter, severityFilter, stationFilter]
    );

    const fetchParameterTypes = useCallback(async () => {
        try {
            const result = await getParameters({ page: 1, limit: "all" as const, search: "" });
            setParameterTypes(result.data);
        } catch {
            setParameterTypes([]);
        }
    }, []);

    const fetchStations = useCallback(async () => {
        try {
            const result = await getStations({ page: 1, limit: "all" as const, search: "" });
            setStations(result.data);
        } catch {
            setStations([]);
        }
    }, []);

    useEffect(() => {
        fetchPage(1);
        fetchParameterTypes();
        fetchStations();
    }, [fetchPage, fetchParameterTypes]);

    function handleSearch(value: string) {
        setSearch(value);
        fetchPage(1, limit, value, parameterTypeFilter, severityFilter, stationFilter);
    }

    function handleParameterTypeFilter(value: number) {
        setParameterTypeFilter(value);
        fetchPage(1, limit, search, value, severityFilter, stationFilter);
    }

    function handleStationFilter(value: number) {
        setStationFilter(value);
        fetchPage(1, limit, search, parameterTypeFilter, severityFilter, value);
    }

    function handleSeverityFilter(value: string) {
        setSeverityFilter(value);
        fetchPage(1, limit, search, parameterTypeFilter, value, stationFilter);
    }

    function formatDate(iso: string) {
        return (
            new Date(iso).toLocaleDateString("pt-BR") +
            " " +
            new Date(iso).toLocaleTimeString("pt-BR")
        );
    }

    const { page, total, totalPages } = data.pagination;

    return (
        <div className="space-y-4">
            <AlertLogFilters
                search={search}
                parameterTypeFilter={parameterTypeFilter}
                parameterTypes={parameterTypes}
                severityFilter={severityFilter}
                stationFilter={stationFilter}
                stations={stations}
                onSeverityFilter={handleSeverityFilter}
                onSearch={handleSearch}
                onParameterTypeFilter={handleParameterTypeFilter}
                onStationFilter={handleStationFilter}
            />

            <div className="bg-card-background border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border text-[11px] uppercase tracking-wider text-secondary-text">
                                <th className="text-left px-4 py-3 font-medium">Data/Hora</th>
                                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Estação</th>
                                <th className="text-left px-4 py-3 font-medium">Parâmetro</th>
                                <th className="text-left px-4 py-3 font-medium">Valor</th>
                                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Regra Disparada</th>
                                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Severidade</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                Array.from({ length: limit }).map((_, i) => (
                                    <tr key={i}>
                                        {Array.from({ length: 6 }).map((_, j) => (
                                            <td key={j} className="px-4 py-3">
                                                <div className="h-4 rounded bg-border animate-pulse" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : data.data.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-secondary-text">
                                        Nenhum registro encontrado.
                                    </td>
                                </tr>
                            ) : (
                                data.data.map((log) => (
                                    <tr key={log.id} className="hover:bg-background/50 transition-colors">
                                        <td className="px-4 py-3 text-secondary-text text-xs">
                                            {formatDate(log.created_at).split(" ")[0]}
                                            <br />
                                            {formatDate(log.created_at).split(" ")[1]}
                                        </td>
                                        <td className="px-4 py-3 hidden sm:table-cell">
                                            <span className="font-medium text-foreground">
                                                {log.stations?.name}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-secondary-text">
                                            <div className="flex items-center gap-2">
                                                <ParameterIcon name={log.parameters?.parameter_types?.name || "Parâmetro"} />
                                                <div>
                                                    {log.name}
                                                    <br />
                                                    <span className="text-xs text-secondary-text">
                                                        {log.parameters?.parameter_types?.unit} - {log.parameters?.parameter_types?.symbol}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-foreground">
                                            {log.measurement} {log.parameters?.parameter_types?.symbol}
                                        </td>
                                        <td className="px-4 py-3 hidden md:table-cell text-secondary-text">
                                            {log.name}
                                            <br />
                                            <span className="text-[11px]">
                                                {log.operator} {log.value} {log.parameters?.parameter_types?.symbol}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 hidden md:table-cell">
                                            <SeverityBadge severity={log.severity} />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-border">
                    <p className="text-[11px] text-secondary-text">
                        {total === 0
                            ? "Nenhum resultado"
                            : `Exibindo ${(page - 1) * limit + 1}–${Math.min(page * limit, total)} de ${total} registros`}
                    </p>
                    {totalPages > 1 && (
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => fetchPage(page - 1)}
                                disabled={page === 1 || loading}
                                className="px-3 py-1.5 text-xs rounded-lg border border-border text-secondary-text hover:bg-background disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                                <button
                                    key={n}
                                    onClick={() => fetchPage(n)}
                                    disabled={loading}
                                    className={[
                                        "w-7 h-7 text-xs rounded-lg font-semibold transition-colors",
                                        n === page
                                            ? "bg-primary text-white"
                                            : "border border-border text-secondary-text hover:bg-background",
                                    ].join(" ")}
                                >
                                    {n}
                                </button>
                            ))}
                            <button
                                onClick={() => fetchPage(page + 1)}
                                disabled={page === totalPages || loading}
                                className="px-3 py-1.5 text-xs rounded-lg border border-border text-secondary-text hover:bg-background disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}