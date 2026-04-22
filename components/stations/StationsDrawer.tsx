"use client";

import { useEffect, useState } from "react";
import { X, Pencil, Trash2, Copy, Check } from "lucide-react";
import { ParameterIcon } from "@/components/alerts/ParameterIcon";
import { getStationById } from "@/services/stations";
import type { StationWithDetails } from "@/types/station";
import type { UserRole } from "@/types/user";

interface StationDrawerProps {
    stationId: number;
    sessionRole: UserRole;
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

function StatusBadge({ status }: { status: boolean }) {
    return (
        <span
            className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${status
                    ? "bg-green-500/10 text-green-400 border-green-500/20"
                    : "bg-border text-secondary-text border-border"
                }`}
        >
            <span className={`w-1.5 h-1.5 rounded-full ${status ? "bg-green-400" : "bg-secondary-text"}`} />
            {status ? "Ativa" : "Inativa"}
        </span>
    );
}

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);

    async function handleCopy() {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }

    return (
        <button
            onClick={handleCopy}
            className="p-1 rounded text-secondary-text hover:text-foreground transition-colors"
            title="Copiar"
        >
            {copied ? <Check size={12} /> : <Copy size={12} />}
        </button>
    );
}

function formatDate(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function getLastMeasurement(
    station: StationWithDetails,
    parameterId: number,
): { value: number; unit: string } | null {
    const param = station.parameters.find((p) => p.id === parameterId);
    if (!param || !param.measurements || param.measurements.length === 0) return null;

    const last = param.measurements.reduce((a, b) =>
        new Date(a.date_time) > new Date(b.date_time) ? a : b,
    );

    return { value: last.value, unit: param.parameter_types.unit };
}

export function StationDrawer({
    stationId,
    sessionRole,
    onClose,
    onEdit,
    onDelete,
}: StationDrawerProps) {
    const [station, setStation] = useState<StationWithDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetch() {
            setLoading(true);
            setError(null);
            try {
                const data = await getStationById(stationId);
                setStation(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Erro ao carregar estação.");
            } finally {
                setLoading(false);
            }
        }
        fetch();
    }, [stationId]);

    const canEdit = sessionRole !== "USER";
    const canDelete = sessionRole === "ADMIN";

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 z-40 bg-black/40"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Drawer */}
            <aside className="fixed right-0 top-0 h-screen w-full max-w-sm z-50 bg-background border-l border-border flex flex-col shadow-2xl">
                {/* Header */}
                <div className="flex items-start justify-between px-5 py-4 border-b border-border shrink-0">
                    {loading || !station ? (
                        <div className="space-y-2">
                            <div className="h-4 w-40 rounded bg-border animate-pulse" />
                            <div className="h-3 w-24 rounded bg-border animate-pulse" />
                        </div>
                    ) : (
                        <div>
                            <h2 className="text-sm font-semibold text-foreground">{station.name}</h2>
                            <div className="mt-1">
                                <StatusBadge status={station.status} />
                            </div>
                        </div>
                    )}
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg text-secondary-text hover:text-foreground hover:bg-card-background transition-colors shrink-0 ml-3"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                    {error && (
                        <p className="text-xs text-alert bg-alert/10 border border-alert/20 px-3 py-2 rounded-lg">
                            {error}
                        </p>
                    )}

                    {loading ? (
                        <div className="space-y-4">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="h-10 rounded-lg bg-card-background animate-pulse" />
                            ))}
                        </div>
                    ) : station ? (
                        <>
                            {/* Info grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-0.5">
                                    <p className="text-[10px] uppercase tracking-wider text-secondary-text font-medium">
                                        ID do Datalogger
                                    </p>
                                    <div className="flex items-center gap-1">
                                        <span className="font-mono text-xs text-primary">{station.id_datalogger}</span>
                                        <CopyButton text={station.id_datalogger} />
                                    </div>
                                </div>

                                <div className="space-y-0.5">
                                    <p className="text-[10px] uppercase tracking-wider text-secondary-text font-medium">
                                        Última Transmissão
                                    </p>
                                    <p className="text-xs text-foreground">{formatDate(station.last_measurement)}</p>
                                </div>

                                <div className="space-y-0.5">
                                    <p className="text-[10px] uppercase tracking-wider text-secondary-text font-medium">
                                        Localização
                                    </p>
                                    <p className="text-xs text-foreground">{station.address ?? "—"}</p>
                                </div>

                                {station.latitude && station.longitude && (
                                    <div className="space-y-0.5">
                                        <p className="text-[10px] uppercase tracking-wider text-secondary-text font-medium">
                                            Coordenadas
                                        </p>
                                        <p className="text-xs text-foreground font-mono">
                                            {station.latitude.toFixed(4)}° / {station.longitude.toFixed(4)}°
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Sensores */}
                            {station.parameters.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-[10px] uppercase tracking-wider text-secondary-text font-medium">
                                        Sensores Configurados
                                    </p>
                                    <div className="space-y-1.5">
                                        {station.parameters.map((p) => {
                                            const last = getLastMeasurement(station, p.id);
                                            return (
                                                <div
                                                    key={p.id}
                                                    className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-card-background border border-border"
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <ParameterIcon name={p.parameter_types.name} size={15} />
                                                        <span className="text-xs font-medium text-foreground">
                                                            {p.parameter_types.name}
                                                        </span>
                                                    </div>
                                                    {last ? (
                                                        <span className="text-xs font-semibold text-foreground">
                                                            {last.value}
                                                            <span className="text-secondary-text font-normal ml-0.5">
                                                                {p.parameter_types.symbol ?? p.parameter_types.unit}
                                                            </span>
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-secondary-text">—</span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Histórico placeholder */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] uppercase tracking-wider text-secondary-text font-medium">
                                        Histórico — Últimas 24h
                                    </p>
                                    {station.parameters[0] && (
                                        <span className="text-[10px] text-secondary-text">
                                            {station.parameters[0].parameter_types.name}
                                        </span>
                                    )}
                                </div>
                                <div className="h-32 rounded-lg bg-card-background border border-border flex items-center justify-center">
                                    <p className="text-xs text-secondary-text">Gráfico em breve</p>
                                </div>
                            </div>
                        </>
                    ) : null}
                </div>

                {/* Footer */}
                {(canEdit || canDelete) && (
                    <div className="flex items-center gap-2 px-5 py-4 border-t border-border shrink-0">
                        {canEdit && (
                            <button
                                onClick={onEdit}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-border text-foreground hover:bg-card-background transition-colors"
                            >
                                <Pencil size={13} />
                                Editar
                            </button>
                        )}
                        {canDelete && (
                            <button
                                onClick={onDelete}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-alert/10 border border-alert/20 text-alert hover:bg-alert/20 transition-colors"
                            >
                                <Trash2 size={13} />
                                Remover
                            </button>
                        )}
                    </div>
                )}
            </aside>
        </>
    );
}