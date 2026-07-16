"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { Grid2X2, List, Search } from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeading } from "@/components/page-heading";
import { SignalCard } from "@/components/signals/signal-card";
import type { DemoSignal } from "@/lib/demo-data";

type ArchiveSignal = DemoSignal & { isSaved?: boolean; isDraft?: boolean };
const tabs = ["Created", "Saved", "Private", "Drafts"];

export default function ArchivePage() {
  const { data: session } = useSession();
  const [tab, setTab] = React.useState("Created");
  const [query, setQuery] = React.useState("");
  const [list, setList] = React.useState(false);
  const [signals, setSignals] = React.useState<ArchiveSignal[]>([]);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    if (!session?.user?.id) return;
    let active = true;
    fetch(`/api/signals?limit=50&includeDrafts=true&authorId=${encodeURIComponent(session.user.id)}`)
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!active || !Array.isArray(data?.signals)) return;
        setSignals(data.signals.map((signal: Omit<ArchiveSignal, "tags"> & { tags?: string | string[] }) => ({ ...signal, tags: Array.isArray(signal.tags) ? signal.tags : (signal.tags || "").split(",").filter(Boolean) })));
      })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, [session?.user?.id]);

  const items = signals.filter((signal) => {
    const matches = `${signal.title || ""} ${signal.description || ""} ${(signal.tags || []).join(" ")}`.toLowerCase().includes(query.toLowerCase());
    if (!matches) return false;
    if (tab === "Saved") return Boolean(signal.isSaved);
    if (tab === "Private") return signal.visibility === "PRIVATE";
    if (tab === "Drafts") return Boolean(signal.isDraft);
    return !signal.isDraft;
  });

  return <AppLayout><PageHeading eyebrow="Archive" title="Everything you kept" description="Search, sort, and return to your private corner of the archive."/><div className="mb-6 flex gap-5 overflow-x-auto border-b border-white/[.06]">{tabs.map((item) => <button key={item} onClick={() => setTab(item)} className={`shrink-0 border-b py-3 font-mono text-[10px] ${tab === item ? "border-violet-400 text-zinc-200" : "border-transparent text-zinc-600"}`}>{item}</button>)}</div><div className="mb-6 flex gap-2"><div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-zinc-600"/><input value={query} onChange={(event) => setQuery(event.target.value)} className="h-10 w-full rounded-lg border border-white/[.07] bg-white/[.02] pl-10 font-mono text-xs outline-none" placeholder="Search your archive..."/></div><button onClick={() => setList(false)} className={`w-10 rounded-lg border border-white/[.07] ${!list ? "text-violet-300" : "text-zinc-600"}`}><Grid2X2 className="mx-auto h-4 w-4"/></button><button onClick={() => setList(true)} className={`w-10 rounded-lg border border-white/[.07] ${list ? "text-violet-300" : "text-zinc-600"}`}><List className="mx-auto h-4 w-4"/></button></div>{!ready ? <div className="h-48 animate-pulse rounded-xl border border-white/[.05] bg-white/[.02]"/> : items.length ? <div className={list ? "grid gap-4" : "columns-1 gap-4 sm:columns-2 xl:columns-3"}>{items.map((item) => <SignalCard key={item.id} signal={item} variant={list ? "compact" : "default"}/>)}</div> : <div className="rounded-xl border border-dashed border-white/10 py-20 text-center font-mono text-xs text-zinc-600">Nothing in {tab.toLowerCase()} yet.</div>}</AppLayout>;
}
