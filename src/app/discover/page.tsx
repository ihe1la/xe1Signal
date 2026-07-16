"use client";

import * as React from "react";
import { SlidersHorizontal } from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { SignalCard } from "@/components/signals/signal-card";
import type { DemoSignal } from "@/lib/demo-data";

const types = ["ALL", "IMAGE", "LINK", "NOTE", "SONG", "CODE", "SCREENSHOT", "AUDIO", "DOCUMENT"];

export default function DiscoverPage() {
  const [type, setType] = React.useState("ALL");
  const [sort, setSort] = React.useState("latest");
  const [ready, setReady] = React.useState(false);
  const [persistedSignals, setPersistedSignals] = React.useState<DemoSignal[]>([]);
  React.useEffect(() => {
    let active = true;
    fetch("/api/signals?limit=50&scope=public").then((response) => response.ok ? response.json() : null).then((data) => {
      if (!active || !Array.isArray(data?.signals)) return;
      setPersistedSignals(data.signals.map((raw: unknown) => { const signal=raw as Omit<DemoSignal,"tags">&{tags?:string|string[]}; return { ...signal, tags: Array.isArray(signal.tags) ? signal.tags : (signal.tags||"").split(",").filter(Boolean) }; }));
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
      <section className="mb-5">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[.17em] text-violet-400">Discover</p>
        <h1 className="font-mono text-[28px] leading-tight tracking-tight text-zinc-100 sm:text-[31px]">Signals from the archive</h1>
        <p className="mt-2 font-mono text-[12px] text-zinc-500">Fragments worth keeping.</p>
      </section>
      <div className="mb-5 flex items-center gap-2 overflow-x-auto pb-1 font-mono text-[9px] text-zinc-600">
        <SlidersHorizontal className="mr-1 h-3.5 w-3.5 shrink-0" />
        {types.map((item) => <button key={item} onClick={() => setType(item)} className={`shrink-0 rounded-md border px-2.5 py-1.5 transition ${type === item ? "border-violet-400/20 bg-violet-400/[.08] text-violet-300" : "border-white/[.055] hover:text-zinc-300"}`}>{item === "AUDIO" ? "VOICE" : item}</button>)}
        <select value={sort} onChange={(event) => setSort(event.target.value)} className="ml-auto rounded-md border border-white/[.055] bg-[#0b0c10] px-2.5 py-1.5 outline-none"><option value="latest">LATEST</option><option value="strongest">STRONGEST</option><option value="saved">MOST SAVED</option></select>
      </div>
      {!ready ? <LoadingGrid /> : signals.length ? <div className="columns-1 gap-4 sm:columns-2 xl:columns-3">{signals.map((signal) => <SignalCard key={signal.id} signal={signal} />)}</div> : <div className="rounded-xl border border-dashed border-white/10 px-6 py-20 text-center"><p className="font-mono text-sm text-zinc-300">No signals on this frequency</p><button onClick={() => setType("ALL")} className="mt-3 font-mono text-xs text-violet-300">Clear filter</button></div>}
    </AppLayout>
  );
}

function LoadingGrid() {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{[230,260,220,245,280,235].map((height, index) => <div key={index} className="animate-pulse rounded-[11px] border border-white/[.05] bg-white/[.025]" style={{height}} />)}</div>;
}
