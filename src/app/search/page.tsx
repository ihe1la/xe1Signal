"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Clock, MessageCircle, Radio, Search, User, X } from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeading } from "@/components/page-heading";
import { SignalCard } from "@/components/signals/signal-card";
import type { DemoSignal } from "@/lib/demo-data";

type SearchUser = { id: string; username: string; name: string; strength: number; avatarUrl: string | null; isSelf: boolean };
type SearchFrequency = { id: string; name: string; signalCount: number };

export default function SearchPage() {
  return <React.Suspense fallback={<AppLayout><p className="font-mono text-xs text-zinc-500">Searching archive…</p></AppLayout>}><SearchContent/></React.Suspense>;
}

function SearchContent() {
  const params = useSearchParams();
  const [input, setInput] = React.useState(params.get("q") || "");
  const [query, setQuery] = React.useState(input);
  const [type, setType] = React.useState("ALL");
  const [page, setPage] = React.useState(1);
  const [recent, setRecent] = React.useState<string[]>([]);
  const [signals, setSignals] = React.useState<DemoSignal[]>([]);
  const [frequencies, setFrequencies] = React.useState<SearchFrequency[]>([]);
  const [users, setUsers] = React.useState<SearchUser[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => { setRecent(JSON.parse(localStorage.getItem("signal-searches") || "[]")); }, []);
  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextQuery = input.trim();
      setQuery(nextQuery); setPage(1);
      if (nextQuery) setRecent((current) => {
        const next = [nextQuery, ...current.filter((item) => item !== nextQuery)].slice(0, 5);
        localStorage.setItem("signal-searches", JSON.stringify(next));
        return next;
      });
    }, 280);
    return () => window.clearTimeout(timer);
  }, [input]);

  React.useEffect(() => {
    if (!query) { setSignals([]); setFrequencies([]); setUsers([]); setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true);
    const signalType = type === "ALL" ? "" : `&type=${encodeURIComponent(type)}`;
    Promise.all([
      fetch(`/api/signals?scope=public&limit=50&q=${encodeURIComponent(query)}${signalType}`, { signal: controller.signal }).then((response) => response.ok ? response.json() : Promise.reject()),
      fetch(`/api/frequencies?limit=20&q=${encodeURIComponent(query)}`, { signal: controller.signal }).then((response) => response.ok ? response.json() : Promise.reject()),
      fetch(`/api/users?limit=20&q=${encodeURIComponent(query)}`, { signal: controller.signal }).then((response) => response.ok ? response.json() : Promise.reject()),
    ]).then(([signalData, frequencyData, userData]) => {
      setSignals((signalData.signals || []).map((raw: Omit<DemoSignal, "tags"> & { tags?: string | string[] }) => ({ ...raw, tags: Array.isArray(raw.tags) ? raw.tags : (raw.tags || "").split(",").filter(Boolean) })));
      setFrequencies(frequencyData.frequencies || []);
      setUsers(userData.users || []);
    }).catch(() => { if (!controller.signal.aborted) { setSignals([]); setFrequencies([]); setUsers([]); } }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query, type]);

  const visibleSignals = signals.slice(0, page * 6);
  return <AppLayout>
    <PageHeading eyebrow="Search" title="Search the whole archive" description="Find public Signals, frequencies, and people by name or @username."/>
    <div className="relative mb-4"><Search className="absolute left-4 top-3.5 h-4 w-4 text-zinc-600"/><input autoFocus value={input} onChange={(event) => setInput(event.target.value)} className="h-11 w-full rounded-lg border border-white/[.08] bg-white/[.02] pl-11 pr-10 font-mono text-xs outline-none focus:border-violet-400/30" placeholder="Search signals, frequencies, or @username..."/>{input && <button onClick={() => setInput("")} className="absolute right-3 top-3.5" aria-label="Clear search"><X className="h-4 w-4 text-zinc-600"/></button>}</div>
    <div className="mb-7 flex gap-2 overflow-x-auto">{["ALL","IMAGE","LINK","NOTE","CODE","SONG","AUDIO"].map((item) => <button key={item} onClick={() => setType(item)} className={`rounded-md border px-2.5 py-1.5 font-mono text-[9px] ${type === item ? "border-violet-400/20 text-violet-300" : "border-white/[.06] text-zinc-600"}`}>{item}</button>)}</div>
    {!query ? <section><h2 className="mb-4 font-mono text-[9px] uppercase tracking-wider text-zinc-600">Recent searches</h2><div className="space-y-2">{recent.length ? recent.map((item) => <button onClick={() => setInput(item)} key={item} className="flex w-full items-center gap-3 rounded-lg border border-white/[.05] p-3 font-mono text-[10px] text-zinc-500"><Clock className="h-3.5 w-3.5"/>{item}</button>) : <p className="font-mono text-[10px] text-zinc-700">Your recent searches will appear here.</p>}</div></section> : loading ? <div className="h-48 animate-pulse rounded-xl border border-white/[.05] bg-white/[.02]"/> : <><section className="mb-9 grid gap-4 sm:grid-cols-2">{frequencies.slice(0, 4).map((frequency) => <Link href={`/frequencies/${frequency.id}`} key={frequency.id} className="flex items-center gap-3 rounded-lg border border-white/[.06] p-4"><Radio className="h-4 w-4 text-violet-300"/><span className="font-mono text-[11px] text-zinc-300">{frequency.name}<small className="mt-1 block text-zinc-600">Frequency · {frequency.signalCount} signals</small></span></Link>)}{users.slice(0, 6).map((person) => <div key={person.id} className="flex items-center gap-3 rounded-lg border border-white/[.06] p-4"><User className="h-4 w-4 shrink-0 text-violet-300"/><Link href={`/profile/${person.username}`} className="min-w-0 flex-1 truncate font-mono text-[11px] text-zinc-300">{person.name}<small className="mt-1 block truncate text-zinc-600">@{person.username} · strength {person.strength}</small></Link>{!person.isSelf && <Link href={`/inbox/${person.username}`} aria-label={`Message ${person.username}`} className="rounded-md p-2 text-zinc-500 hover:bg-white/5 hover:text-violet-300"><MessageCircle className="h-4 w-4"/></Link>}</div>)}</section><h2 className="mb-4 font-mono text-[9px] uppercase tracking-wider text-zinc-600">Signals · {signals.length}</h2>{visibleSignals.length ? <div className="columns-1 gap-4 sm:columns-2 xl:columns-3">{visibleSignals.map((signal) => <SignalCard key={signal.id} signal={signal}/>)}</div> : <div className="rounded-xl border border-dashed border-white/10 py-16 text-center font-mono text-xs text-zinc-600">No public Signals match. Try a broader word or another type.</div>}{visibleSignals.length < signals.length && <button onClick={() => setPage((value) => value + 1)} className="mx-auto mt-6 block rounded-lg border border-white/[.08] px-4 py-2 font-mono text-[10px] text-zinc-500">More results</button>}</>}
  </AppLayout>;
}
