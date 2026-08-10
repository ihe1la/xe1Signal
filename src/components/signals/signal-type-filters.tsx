"use client";

import type { ReactNode } from "react";
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
  trailing,
}: {
  value: string;
  onChange: (type: string) => void;
  types?: readonly string[];
  className?: string;
  trailing?: ReactNode;
}) {
  return (
    <div className={cn("flex items-center gap-2 overflow-x-auto pb-1 font-mono text-[9px]", className)}>
      <SlidersHorizontal className="mr-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden />
      {types.map((item) => {
        const active = value === item;
        return (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            aria-pressed={active}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 uppercase tracking-[.1em] transition",
              active
                ? "border-violet-400/40 bg-violet-500 text-white shadow-[0_0_18px_rgba(139,92,246,.22)]"
                : "border-white/[.07] bg-[#0c0d12] text-zinc-500 hover:border-white/[.12] hover:text-zinc-300",
            )}
          >
            {labelForType(item)}
          </button>
        );
      })}
      {trailing ? <div className="ml-auto shrink-0 pl-2">{trailing}</div> : null}
    </div>
  );
}
