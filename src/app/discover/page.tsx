"use client";

import * as React from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { SignalCard } from "@/components/signals/signal-card";
import { SignalTypeFilters } from "@/components/signals/signal-type-filters";
import { demoSignals, type DemoSignal } from "@/lib/demo-data";

function normalizeSignal(raw: unknown): DemoSignal {
  const signal = raw as Omit<DemoSignal, "tags"> & { tags?: string | string[] };
  return {
    ...signal,
    tags: Array.isArray(signal.tags)
      ? signal.tags
      : (signal.tags || "").split(",").filter(Boolean),
  } as DemoSignal;
}

function mergeSignals(apiSignals: DemoSignal[]) {
  const byId = new Map<string, DemoSignal>();
  for (const signal of demoSignals) byId.set(signal.id, signal);
  for (const signal of apiSignals) byId.set(signal.id, signal);
  const preferred = demoSignals.map((signal) => byId.get(signal.id)!);
  const extras = apiSignals.filter((signal) => !demoSignals.some((demo) => demo.id === signal.id));
  return [...preferred, ...extras];
}

export default function DiscoverPage() {
  const [type, setType] = React.useState("ALL");
  const [sort, setSort] = React.useState("latest");
  const [ready, setReady] = React.useState(false);
  const [persistedSignals, setPersistedSignals] = React.useState<DemoSignal[]>(demoSignals);

  React.useEffect(() => {
    let active = true;
    fetch("/api/signals?limit=50&scope=public")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!active) return;
        const apiSignals = Array.isArray(data?.signals)
          ? data.signals.map(normalizeSignal)
          : [];
        setPersistedSignals(mergeSignals(apiSignals));
      })
      .catch(() => {
        if (active) setPersistedSignals(demoSignals);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const signals = React.useMemo(() => {
    const filtered =
      type === "ALL"
        ? [...persistedSignals]
        : persistedSignals.filter((signal) => signal.type === type);
    if (sort === "strongest") filtered.sort((a, b) => b.signalStrength - a.signalStrength);
    if (sort === "saved") filtered.sort((a, b) => b.saveCount - a.saveCount);
    return filtered;
  }, [persistedSignals, type, sort]);

  return (
    <AppLayout>
      <section className="mb-5">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[.17em] text-violet-400">
          Discover
        </p>
        <h1 className="font-mono text-[28px] leading-tight tracking-tight text-zinc-100 sm:text-[31px]">
          Signals from the archive
        </h1>
        <p className="mt-2 font-mono text-[12px] text-zinc-500">Fragments worth keeping.</p>
      </section>

      <div className="mb-5">
        <SignalTypeFilters
          value={type}
          onChange={setType}
          trailing={
            <label className="font-mono text-[9px] uppercase tracking-[.12em] text-zinc-500">
              <span className="sr-only">Sort signals</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value)}
                className="rounded-md border border-white/[.07] bg-[#0c0d12] px-2.5 py-1.5 text-zinc-400 outline-none transition hover:border-white/[.12] hover:text-zinc-300"
              >
                <option value="latest">LATEST</option>
                <option value="strongest">STRONGEST</option>
                <option value="saved">MOST SAVED</option>
              </select>
            </label>
          }
        />
      </div>

      {!ready ? (
        <LoadingGrid />
      ) : signals.length ? (
        <div className="columns-1 gap-4 sm:columns-2 xl:columns-3">
          {signals.map((signal) => (
            <SignalCard key={signal.id} signal={signal} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-white/10 px-6 py-20 text-center">
          <p className="font-mono text-sm text-zinc-300">No signals on this frequency</p>
          <button
            onClick={() => setType("ALL")}
            className="mt-3 font-mono text-xs text-violet-300"
          >
            Clear filter
          </button>
        </div>
      )}
    </AppLayout>
  );
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {[210, 240, 200, 225, 250, 215].map((height, index) => (
        <div
          key={index}
          className="animate-pulse rounded-[12px] border border-white/[.05] bg-white/[.02]"
          style={{ height }}
        />
      ))}
    </div>
  );
}
