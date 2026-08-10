"use client";

import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export const DISCOVER_SIGNAL_TYPES = [
  "ALL",
  "IMAGE",
  "LINK",
  "NOTE",
  "SONG",
  "CODE",
  "SCREENSHOT",
  "AUDIO",
  "DOCUMENT",
] as const;

export type DiscoverSignalType = (typeof DISCOVER_SIGNAL_TYPES)[number];

function labelForType(type: string) {
  return type === "AUDIO" ? "VOICE" : type;
}

export function SignalTypeFilters({
  value,
  onChange,
  types = DISCOVER_SIGNAL_TYPES,
  className,
}: {
  value: string;
  onChange: (type: string) => void;
  types?: readonly string[];
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2 overflow-x-auto pb-1 font-mono text-[9px]", className)}>
      <SlidersHorizontal className="mr-0.5 h-3.5 w-3.5 shrink-0 text-zinc-600" aria-hidden />
      {types.map((item) => {
        const active = value === item;
        return (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            aria-pressed={active}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 uppercase tracking-[.08em] transition",
              active
                ? "border-violet-400/25 bg-violet-400/[.1] text-violet-300"
                : "border-white/[.06] bg-transparent text-zinc-600 hover:border-white/[.1] hover:text-zinc-300",
            )}
          >
            {labelForType(item)}
          </button>
        );
      })}
    </div>
  );
}
