"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Plus, X } from "lucide-react";

interface StationOption {
  id: number;
  name: string;
}

interface StationsMultiSelectProps {
  label: string;
  options: StationOption[];
  selectedIds: number[];
  onChange: (nextIds: number[]) => void;
  placeholder?: string;
}

export function StationsMultiSelect({
  label,
  options,
  selectedIds,
  onChange,
  placeholder = "Selecione uma ou mais estacoes",
}: StationsMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const selectedOptions = useMemo(
    () => options.filter((option) => selectedIdSet.has(option.id)),
    [options, selectedIdSet],
  );

  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;

    return options.filter((option) =>
      option.name.toLowerCase().includes(normalized),
    );
  }, [options, query]);

  function toggleOption(optionId: number) {
    if (selectedIdSet.has(optionId)) {
      onChange(selectedIds.filter((id) => id !== optionId));
      return;
    }

    onChange([...selectedIds, optionId]);
  }

  function removeOption(optionId: number) {
    onChange(selectedIds.filter((id) => id !== optionId));
  }

  return (
    <div className="space-y-1.5" ref={rootRef}>
      <label className="text-xs font-medium text-secondary-text">{label}</label>

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="w-full min-h-10 rounded-lg border border-border bg-background px-2.5 py-2 text-left focus:outline-none focus:border-primary transition-colors"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {selectedOptions.length === 0 ? (
                <span className="text-sm text-secondary-text">{placeholder}</span>
              ) : (
                selectedOptions.map((option) => (
                  <span
                    key={option.id}
                    className="inline-flex items-center gap-1 rounded-md bg-primary text-white text-xs px-2 py-1"
                  >
                    {option.name}
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(event) => {
                        event.stopPropagation();
                        removeOption(option.id);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          event.stopPropagation();
                          removeOption(option.id);
                        }
                      }}
                      className="inline-flex"
                    >
                      <X size={12} />
                    </span>
                  </span>
                ))
              )}
            </div>

            <span className="text-secondary-text shrink-0 pt-0.5">
              <Plus size={14} />
            </span>
          </div>
        </button>

        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card-background shadow-xl">
            <div className="p-2 border-b border-border">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar estacao..."
                className="w-full h-8 rounded-md bg-background border border-border px-2.5 text-sm text-foreground placeholder:text-secondary-text focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            <div className="max-h-44 overflow-auto p-1.5 space-y-1">
              {filteredOptions.length === 0 ? (
                <p className="px-2 py-1.5 text-xs text-secondary-text">
                  Nenhuma estacao encontrada.
                </p>
              ) : (
                filteredOptions.map((option) => {
                  const selected = selectedIdSet.has(option.id);
                  return (
                    <button
                      type="button"
                      key={option.id}
                      onClick={() => toggleOption(option.id)}
                      className={[
                        "w-full flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors",
                        selected
                          ? "bg-primary/10 text-foreground"
                          : "text-secondary-text hover:bg-background hover:text-foreground",
                      ].join(" ")}
                    >
                      <span>{option.name}</span>
                      {selected && <Check size={14} className="text-primary" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
