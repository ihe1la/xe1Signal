"use client";

import * as React from "react";
import { SlidersHorizontal } from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { SignalCard } from "@/components/signals/signal-card";
import type { DemoSignal } from "@/lib/demo-data";

const tabs = ["For you", "Recent", "Following"] as const;
const typeFilters = [
  ["ALL", "All"],
  ["IMAGE", "Image"],
  ["LINK", "Link"],
  ["NOTE", "Note"],
  ["SONG", "Song"],
  ["CODE", "Code"],
  ["SCREENSHOT", "Screenshot"],
  ["AUDIO", "Voice"],
  ["DOCUMENT", "Document"],
] as const;

export default function DiscoverPage() {
  const [feed, setFeed] = React.useState<(typeof tabs)[number]>("For you");
  const [type, setType] = React.useState("ALL");
  const [sort, setSort] = React.useState("latest");
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [ready, setReady] = React.useState(false);
  const [persistedSignals, setPersistedSignals] = React.useState<DemoSignal[]>([]);

  React.useEffect(() => {
    let active = true;
    fetch("/api/signals?limit=50&scope=public").then((response) => response.ok ? response.json() : null).then((data) => {
      if (!active || !Array.isArray(data?.signals)) return;
      setPersistedSignals(data.signals.map((raw: unknown) => {
        const signal = raw as Omit<DemoSignal, "tags"> & { tags?: string | string[] };
        return { ...signal, tags: Array.isArray(signal.tags) ? signal.tags : (signal.tags || "").split(",").filter(Boolean) };
      }));
    }).finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  const signals = React.useMemo(() => {
    const filtered = type === "ALL" ? [...persistedSignals] : persistedSignals.filter((signal) => signal.type === type);
    if (sort === "strongest") filtered.sort((a, b) => b.signalStrength - a.signalStrength);
    if (sort === "saved") filtered.sort((a, b) => b.saveCount - a.saveCount);
    return filtered;
  }, [persistedSignals, type, sort]);

  return (
    <AppLayout>
      <section className="mb-6">
        <h1 className="font-mono text-[30px] leading-tight tracking-tight text-zinc-100 sm:text-[34px]">Discover</h1>
        <p className="mt-2 font-mono text-[12px] text-zinc-500">Explore items shared across the archive.</p>
      </section>

      <section className="mb-6" aria-label="Discover feed controls">
        <div className="flex items-center justify-between gap-4 border-b border-white/[.07]">
          <div className="flex min-w-0 items-center gap-5 overflow-x-auto" role="tablist" aria-label="Discover views">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={feed === tab}
                onClick={() => setFeed(tab)}
                className={`shrink-0 border-b-2 px-1 pb-3 pt-1 font-mono text-[11px] transition ${feed === tab ? "border-violet-400 text-violet-300" : "border-transparent text-zinc-600 hover:text-zinc-300"}`}
              >
                {tab}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-expanded={filterOpen}
            aria-controls="discover-filter-panel"
            onClick={() => setFilterOpen((open) => !open)}
            className="mb-2 inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-white/[.08] px-3 font-mono text-[10px] text-zinc-400 transition hover:border-violet-300/30 hover:text-violet-200"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filter
          </button>
        </div>

        {filterOpen && (
          <div id="discover-filter-panel" className="mt-3 flex flex-wrap items-center gap-2 rounded-[10px] border border-white/[.07] bg-white/[.015] p-3" role="region" aria-label="Discover filters">
            {typeFilters.map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setType(value)}
                className={`rounded-md border px-2.5 py-1.5 font-mono text-[9px] transition ${type === value ? "border-violet-400/25 bg-violet-400/[.08] text-violet-300" : "border-white/[.06] text-zinc-600 hover:text-zinc-300"}`}
              >
                {label}
              </button>
            ))}
            <label className="ml-auto flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.1em] text-zinc-600">
              Sort
              <select aria-label="Sort signals" value={sort} onChange={(event) => setSort(event.target.value)} className="rounded-md border border-white/[.06] bg-[#0b0c10] px-2.5 py-1.5 font-mono text-[9px] text-zinc-400 outline-none">
                <option value="latest">Latest</option>
                <option value="strongest">Strongest</option>
                <option value="saved">Most saved</option>
              </select>
            </label>
          </div>
        )}
      </section>

      {!ready ? <LoadingGrid /> : signals.length ? <div className="columns-1 gap-3 sm:columns-2 xl:columns-3">{signals.map((signal) => <SignalCard key={signal.id} signal={signal} />)}</div> : <div className="rounded-xl border border-dashed border-white/10 px-6 py-20 text-center"><p className="font-mono text-sm text-zinc-300">No signals in this view</p><button onClick={() => setType("ALL")} className="mt-3 font-mono text-xs text-violet-300">Clear filter</button></div>}
    </AppLayout>
  );
}

function LoadingGrid() {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">{[210,240,200,225,250,215].map((height, index) => <div key={index} className="animate-pulse rounded-[11px] border border-white/[.05] bg-white/[.02]" style={{ height }} />)}</div>;
}
