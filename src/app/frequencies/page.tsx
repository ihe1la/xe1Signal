"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Search, Users } from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeading } from "@/components/page-heading";

type FrequencyItem = { id: string; name: string; description?: string | null; tags: string; signalCount: number; followerCount: number; isOwner: boolean };

export default function FrequenciesPage() {
  const [query, setQuery] = React.useState("");
  const [items, setItems] = React.useState<FrequencyItem[]>([]);
  React.useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => fetch(`/api/frequencies?limit=50&q=${encodeURIComponent(query)}`).then((response) => response.ok ? response.json() : null).then((data) => { if (active && Array.isArray(data?.frequencies)) setItems(data.frequencies); }), 180);
    return () => { active = false; window.clearTimeout(timer); };
  }, [query]);
  return <AppLayout><PageHeading eyebrow="Frequencies" title="Collections with a pulse" description="Tune into collections shaped by people, subjects, and moods." action={<Link href="/frequencies/new" className="rounded-lg bg-violet-400/[.12] px-4 py-3 font-mono text-[10px] text-violet-300"><Plus className="mr-2 inline h-3.5 w-3.5"/>New frequency</Link>}/><div className="relative mb-6"><Search className="absolute left-3 top-3 h-4 w-4 text-zinc-600"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a frequency..." className="h-10 w-full rounded-lg border border-white/[.07] bg-white/[.02] pl-10 font-mono text-xs outline-none"/></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{items.map((item, index) => <Link key={item.id} href={`/frequencies/${item.id}`} className="group rounded-xl border border-white/[.07] bg-white/[.015] p-5 transition hover:-translate-y-0.5 hover:border-white/[.12]"><span className={`mb-5 block h-2 w-2 rounded-full ${["bg-violet-400","bg-blue-400","bg-amber-300","bg-rose-400"][index % 4]}`}/><h2 className="font-mono text-sm text-zinc-200">{item.name}</h2><p className="mt-3 line-clamp-2 font-mono text-[10px] leading-5 text-zinc-600">{item.description}</p><p className="mt-5 flex items-center gap-2 font-mono text-[9px] text-zinc-700"><Users className="h-3 w-3"/>{item.followerCount} followers <span>·</span> {item.signalCount} signals{item.isOwner && <span className="ml-auto text-violet-300/60">yours</span>}</p></Link>)}</div>{!items.length && <div className="rounded-xl border border-dashed border-white/10 py-20 text-center font-mono text-xs text-zinc-600">No frequencies found.</div>}</AppLayout>;
}
