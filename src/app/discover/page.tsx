"use client";

import * as React from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { useSession } from "next-auth/react";
import { AppLayout } from "@/components/layout/app-layout";
import { SignalCard } from "@/components/signals/signal-card";
import type { DemoSignal } from "@/lib/demo-data";

const types = ["ALL", "IMAGE", "LINK", "NOTE", "SONG", "CODE", "SCREENSHOT", "AUDIO", "DOCUMENT"];

export default function DiscoverPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [type, setType] = React.useState("ALL");
  const [sort, setSort] = React.useState("latest");
  const [ready, setReady] = React.useState(false);
  const [persistedSignals, setPersistedSignals] = React.useState<DemoSignal[]>([]);
  React.useEffect(() => {
    if (sessionStatus === "loading") return;

    let active = true;
    setReady(false);
    const params = new URLSearchParams({ limit: "24", scope: "public" });
    if (session?.user?.id) params.set("authorId", session.user.id);
    fetch(`/api/signals?${params}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!active || !Array.isArray(data?.signals)) return;
        setPersistedSignals(
          data.signals.map((raw: unknown) => {
            const signal = raw as Omit<DemoSignal, "tags"> & { tags?: string | string[] };
            return {
              ...signal,
              tags: Array.isArray(signal.tags) ? signal.tags : (signal.tags || "").split(",").filter(Boolean),
            };
          }),
        );
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [session?.user?.id, sessionStatus]);

  const signals = React.useMemo(() => {
    const filtered = type === "ALL" ? [...persistedSignals] : persistedSignals.filter((signal) => signal.type === type);
    if (sort === "strongest") filtered.sort((a, b) => b.signalStrength - a.signalStrength);
    if (sort === "saved") filtered.sort((a, b) => b.saveCount - a.saveCount);
    return filtered;
  }, [persistedSignals, type, sort]);

  return (
    <AppLayout>
      <section className="mb-7">
        <p className="mb-3 text-[11px] font-medium uppercase tracking-[.2em] text-violet-400">Discover</p>
        <h1 className="text-[30px] font-semibold leading-tight tracking-tight text-zinc-50 sm:text-[34px]">
          Signals from the archive
        </h1>
        <p className="mt-2 text-[15px] text-zinc-500">Fragments worth keeping.</p>
      </section>
      <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-1 text-[10px] font-medium uppercase tracking-[.12em] text-zinc-500">
        <SlidersHorizontal className="mr-1 h-4 w-4 shrink-0 text-zinc-500" />
        {types.map((item) => (
          <button
            key={item}
            onClick={() => setType(item)}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 transition ${
              type === item
                ? "border-violet-400/45 bg-violet-500/15 text-violet-200"
                : "border-white/[.08] text-zinc-500 hover:border-white/[.14] hover:text-zinc-300"
            }`}
          >
            {item === "AUDIO" ? "VOICE" : item}
          </button>
        ))}
        <label className="relative ml-auto shrink-0">
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            className="appearance-none rounded-full border border-white/[.08] bg-transparent py-1.5 pl-3.5 pr-8 outline-none hover:border-white/[.14] hover:text-zinc-300"
          >
            <option value="latest">Latest</option>
            <option value="strongest">Strongest</option>
            <option value="saved">Most saved</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
        </label>
      </div>
      {!ready ? (
        <LoadingGrid />
      ) : signals.length ? (
        <div className="grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {signals.map((signal) => (
            <SignalCard key={signal.id} signal={signal} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-white/10 px-6 py-20 text-center">
          <p className="text-sm text-zinc-300">No signals on this frequency</p>
          <button onClick={() => setType("ALL")} className="mt-3 text-xs text-violet-300">
            Clear filter
          </button>
        </div>
      )}
    </AppLayout>
  );
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {[230, 260, 220, 245, 280, 235].map((height, index) => (
        <div
          key={index}
          className="animate-pulse rounded-[14px] border border-white/[.05] bg-white/[.025]"
          style={{ height }}
        />
      ))}
    </div>
  );
}
