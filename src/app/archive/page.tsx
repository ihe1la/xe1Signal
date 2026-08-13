"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Grid2X2, List, Search, Users } from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeading } from "@/components/page-heading";
import { SignalCard } from "@/components/signals/signal-card";
import type { DemoSignal } from "@/lib/demo-data";

type LibraryTab = "All" | "Collections" | "Saved" | "Mine" | "Drafts";
type ArchiveSignal = DemoSignal & { isSaved?: boolean; isDraft?: boolean };
type Collection = { id: string; name: string; description?: string | null; signalCount: number; followerCount: number; isOwner: boolean };

const tabs: LibraryTab[] = ["All", "Collections", "Saved", "Mine", "Drafts"];

export default function ArchivePage() {
  const { data: session } = useSession();
  const [tab, setTab] = React.useState<LibraryTab>("All");
  const [query, setQuery] = React.useState("");
  const [list, setList] = React.useState(false);
  const [signals, setSignals] = React.useState<ArchiveSignal[]>([]);
  const [collections, setCollections] = React.useState<Collection[]>([]);
  const [ready, setReady] = React.useState(false);
  const [collectionsReady, setCollectionsReady] = React.useState(false);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedTab = params.get("tab");
    if (requestedTab === "collections") setTab("Collections");
    if (params.get("q")) setQuery(params.get("q") || "");
  }, []);

  React.useEffect(() => {
    if (!session?.user?.id) return;
    let active = true;
    fetch(`/api/signals?limit=6&includeDrafts=true&authorId=${encodeURIComponent(session.user.id)}`)
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!active || !Array.isArray(data?.signals)) return;
        setSignals(data.signals.map((signal: Omit<ArchiveSignal, "tags"> & { tags?: string | string[] }) => ({ ...signal, tags: Array.isArray(signal.tags) ? signal.tags : (signal.tags || "").split(",").filter(Boolean) })));
      })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, [session?.user?.id]);

  React.useEffect(() => {
    if (tab !== "Collections") return;
    let active = true;
    setCollectionsReady(false);
    const timer = window.setTimeout(() => {
      fetch(`/api/frequencies?limit=6&q=${encodeURIComponent(query)}`)
        .then((response) => response.ok ? response.json() : null)
        .then((data) => { if (active && Array.isArray(data?.frequencies)) setCollections(data.frequencies); })
        .finally(() => { if (active) setCollectionsReady(true); });
    }, 120);
    return () => { active = false; window.clearTimeout(timer); };
  }, [query, tab]);

  const items = signals.filter((signal) => {
    const matches = `${signal.title || ""} ${signal.description || ""} ${(signal.tags || []).join(" ")}`.toLowerCase().includes(query.toLowerCase());
    if (!matches) return false;
    if (tab === "Saved") return Boolean(signal.isSaved);
    if (tab === "Mine") return signal.owner.id === session?.user?.id && !signal.isDraft;
    if (tab === "Drafts") return Boolean(signal.isDraft);
    return !signal.isDraft;
  });

  return (
    <AppLayout>
      <PageHeading eyebrow="Library" title="Your library" description="Signals, collections, and saved fragments in one place." />
      <div className="mb-6 flex gap-5 overflow-x-auto border-b border-white/[.06]" role="tablist" aria-label="Library views">
        {tabs.map((item) => <button key={item} type="button" role="tab" aria-selected={tab === item} onClick={() => setTab(item)} className={`shrink-0 border-b-2 py-3 font-mono text-[10px] transition ${tab === item ? "border-violet-400 text-zinc-200" : "border-transparent text-zinc-600 hover:text-zinc-300"}`}>{item}</button>)}
      </div>
      <div className="mb-6 flex gap-2">
        <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-zinc-600"/><input value={query} onChange={(event) => setQuery(event.target.value)} className="h-10 w-full rounded-lg border border-white/[.07] bg-white/[.02] pl-10 font-mono text-xs outline-none" placeholder={tab === "Collections" ? "Search collections..." : "Search your library..."}/></div>
        {tab !== "Collections" && <><button type="button" onClick={() => setList(false)} aria-label="Grid view" className={`w-10 rounded-lg border border-white/[.07] ${!list ? "text-violet-300" : "text-zinc-600"}`}><Grid2X2 className="mx-auto h-4 w-4"/></button><button type="button" onClick={() => setList(true)} aria-label="List view" className={`w-10 rounded-lg border border-white/[.07] ${list ? "text-violet-300" : "text-zinc-600"}`}><List className="mx-auto h-4 w-4"/></button></>}
      </div>

      {tab === "Collections" ? (
        !collectionsReady ? <div className="h-48 animate-pulse rounded-xl border border-white/[.05] bg-white/[.02]"/> : collections.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{collections.map((collection, index) => <Link key={collection.id} href={`/frequencies/${collection.id}`} className="group rounded-[11px] border border-white/[.07] bg-white/[.015] p-4 transition hover:-translate-y-0.5 hover:border-white/[.12]"><span className={`mb-5 block h-2 w-2 rounded-full ${["bg-violet-400", "bg-blue-400", "bg-amber-300", "bg-rose-400"][index % 4]}`}/><h2 className="font-mono text-sm text-zinc-200">{collection.name}</h2><p className="mt-2 line-clamp-2 font-mono text-[10px] leading-5 text-zinc-600">{collection.description || "A collection shaped by signals and attention."}</p><p className="mt-5 flex items-center gap-2 font-mono text-[9px] text-zinc-700"><Users className="h-3 w-3"/>{collection.signalCount} signals <span>·</span> {collection.followerCount} followers{collection.isOwner && <span className="ml-auto text-violet-300/60">yours</span>}</p></Link>)}</div> : <EmptyLibrary text="No collections found." />
      ) : (
        !ready ? <div className="h-48 animate-pulse rounded-xl border border-white/[.05] bg-white/[.02]"/> : items.length ? <div className={list ? "grid gap-3" : "grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3"}>{items.map((item) => <SignalCard key={item.id} signal={item} variant={list ? "compact" : "default"}/>)}</div> : <EmptyLibrary text={`Nothing in ${tab.toLowerCase()} yet.`} />
      )}
    </AppLayout>
  );
}

function EmptyLibrary({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-white/10 py-20 text-center font-mono text-xs text-zinc-600">{text}</div>;
}
