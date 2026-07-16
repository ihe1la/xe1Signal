"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowRight, Check, Pencil, Plus, X } from "lucide-react";
import { MOOD_SYMBOLS } from "@/lib/mood-symbols";

type SidebarData = {
  profile: { username: string; name: string; avatarUrl: string | null; strength: number } | null;
  activeFrequency: { id: string; name: string; signalCount: number } | null;
  recentSignal: { id: string; title: string | null; previewImageUrl: string | null; createdAt: string } | null;
  recentTrail: { id: string; title: string; nodeCount: number; nodes: { id: string; title: string | null }[] } | null;
};

export function StrengthBars({ value = 76 }: { value?: number }) {
  return <span className="flex items-end gap-1" aria-label={`Signal strength ${value}`}>{[1,20,40,60,80,100].map((level, index) => <i key={level} className="block w-1 rounded-sm" style={{height: `${5 + index * 2}px`, background: value >= level ? "#8f7be9" : "#24242e"}} />)}</span>;
}

export function RightSidebar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [data, setData] = React.useState<SidebarData>({ profile: null, activeFrequency: null, recentSignal: null, recentTrail: null });
  const username = data.profile?.username || session?.user?.username || "user";
  const name = data.profile?.name || session?.user?.name || username;
  const avatarUrl = data.profile?.avatarUrl;
  const [mood, setMood] = React.useState("low light / private");
  const [symbol, setSymbol] = React.useState("🌙");
  const [draftMood, setDraftMood] = React.useState(mood);
  const [draftSymbol, setDraftSymbol] = React.useState(symbol);
  const [editingMood, setEditingMood] = React.useState(false);
  const [savingMood, setSavingMood] = React.useState(false);

  React.useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return;
    let active = true;
    Promise.all([
      fetch("/api/user/mood").then((response) => response.ok ? response.json() : null),
      fetch("/api/sidebar").then((response) => response.ok ? response.json() : null),
    ]).then(([moodData, sidebarData]) => {
      if (!active) return;
      if (moodData?.mood) {
        setMood(moodData.mood);
        setDraftMood(moodData.mood);
        setSymbol(moodData.symbol || "🌙");
        setDraftSymbol(moodData.symbol || "🌙");
      }
      if (sidebarData) setData(sidebarData);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [pathname, session?.user?.id, status]);

  async function saveMood() {
    const value = draftMood.trim();
    const nextSymbol = draftSymbol.trim();
    if (!value || !nextSymbol) return;
    setSavingMood(true);
    const response = await fetch("/api/user/mood", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ mood: value, symbol: nextSymbol }) });
    setSavingMood(false);
    if (response.ok) {
      setMood(value);
      setDraftMood(value);
      setSymbol(nextSymbol);
      setDraftSymbol(nextSymbol);
      setEditingMood(false);
    }
  }

  function cancelMood() {
    setDraftMood(mood);
    setDraftSymbol(symbol);
    setEditingMood(false);
  }

  return (
    <aside className="fixed bottom-0 right-0 top-20 z-20 hidden w-[304px] border-l border-white/[.055] bg-[#08090d] 2xl:block">
      <div className="scrollbar-thin h-full overflow-y-auto p-4">
        <div className="overflow-hidden rounded-[11px] border border-white/[.065] bg-gradient-to-br from-white/[.025] to-transparent">
          <section className="px-7 pb-7 pt-8">
            {avatarUrl ? <img src={avatarUrl} alt={username} className="mb-4 h-[72px] w-[72px] rounded-full border border-white/10 bg-black object-cover" /> : <span className="mb-4 grid h-[72px] w-[72px] place-items-center rounded-full border border-white/10 bg-white/[.04] font-mono text-2xl text-zinc-400">{username.slice(0, 1).toUpperCase()}</span>}
            <p className="font-mono text-[15px] text-zinc-100">{name}</p>
            <p className="mt-1 font-mono text-[9px] text-zinc-600">@{username}</p>
            <div className="mt-3 flex items-center gap-3 font-mono text-[11px] text-zinc-500"><span>signal strength</span><StrengthBars value={data.profile?.strength || 0} /></div>
          </section>

          <ContextSection label="Active frequency">
            {data.activeFrequency ? <Link href={`/frequencies/${data.activeFrequency.id}`} className="block rounded-lg bg-white/[.025] px-4 py-3"><span className="font-mono text-[13px] text-zinc-200">{data.activeFrequency.name}</span><span className="mt-1 flex items-center justify-between font-mono text-[10px] text-zinc-600"><span>{data.activeFrequency.signalCount} signals</span><StrengthBars value={data.activeFrequency.signalCount ? 50 : 0} /></span></Link> : <EmptyAction href="/frequencies/new" label="Create your first frequency" />}
          </ContextSection>

          <ContextSection label="Current mood">
            {editingMood ? <div className="space-y-3"><div className="flex flex-wrap gap-1.5" aria-label="Choose a mood symbol">{MOOD_SYMBOLS.map((item) => <button key={item} type="button" onClick={() => setDraftSymbol(item)} aria-label={`Use ${item}`} aria-pressed={draftSymbol === item} className={`grid h-8 w-8 place-items-center rounded-md border text-sm grayscale brightness-50 ${draftSymbol === item ? "border-violet-400/50 bg-violet-400/10" : "border-white/[.07] bg-white/[.02]"}`}>{item}</button>)}</div><input maxLength={60} value={draftMood} onChange={(event) => setDraftMood(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void saveMood(); if (event.key === "Escape") cancelMood(); }} className="h-9 w-full rounded-lg border border-white/[.09] bg-white/[.025] px-3 font-mono text-[11px] text-zinc-200 outline-none focus:border-violet-400/30" aria-label="Current mood"/><div className="flex justify-end gap-2"><button onClick={cancelMood} className="rounded-md p-2 text-zinc-600" aria-label="Cancel mood edit"><X className="h-3.5 w-3.5"/></button><button disabled={savingMood || !draftMood.trim() || !draftSymbol.trim()} onClick={() => void saveMood()} className="rounded-md bg-violet-400/[.12] p-2 text-violet-300 disabled:opacity-40" aria-label="Save mood"><Check className="h-3.5 w-3.5"/></button></div></div> : <div className="flex items-center justify-between gap-3 font-mono text-[11px] text-zinc-500"><span className="min-w-0 flex-1 break-words">{mood}</span><span className="text-base grayscale brightness-50" aria-label={`Mood symbol ${symbol}`}>{symbol}</span><button onClick={() => setEditingMood(true)} className="rounded-md p-2 text-zinc-600 hover:bg-white/5 hover:text-violet-300" aria-label="Edit current mood"><Pencil className="h-3.5 w-3.5" /></button></div>}
          </ContextSection>

          <ContextSection label="Recent trail">
            {data.recentTrail ? <Link href={`/trails/${data.recentTrail.id}/edit`} className="block rounded-lg border border-white/[.06] p-3"><span className="font-mono text-[11px] text-zinc-300">{data.recentTrail.title}</span><small className="mt-2 block font-mono text-[9px] text-zinc-600">{data.recentTrail.nodeCount ? `${data.recentTrail.nodeCount} nodes · continue editing` : "Empty trail · add your first node"}</small></Link> : <EmptyAction href="/trails/new/edit" label="Create your first trail" />}
          </ContextSection>

          <ContextSection label="Recent signal">
            {data.recentSignal ? <Link href={`/signals/${data.recentSignal.id}`} className="flex gap-3">{data.recentSignal.previewImageUrl ? <img src={data.recentSignal.previewImageUrl} alt="" className="h-14 w-[72px] rounded-md border border-white/10 object-cover" /> : <span className="grid h-14 w-[72px] place-items-center rounded-md border border-white/10 bg-white/[.03] font-mono text-[9px] text-zinc-600">SIGNAL</span>}<span className="font-mono text-[11px] leading-5 text-zinc-300">{data.recentSignal.title || "Untitled signal"}<small className="block text-zinc-600">Recently created</small></span></Link> : <EmptyAction href="/signals/new" label="Create your first signal" />}
          </ContextSection>

          <Link href={`/profile/${username}`} className="flex items-center gap-2 px-7 py-6 font-mono text-[9px] uppercase tracking-wider text-zinc-500 hover:text-zinc-200">View profile <ArrowRight className="h-3 w-3" /></Link>
        </div>
      </div>
    </aside>
  );
}

function EmptyAction({ href, label }: { href: string; label: string }) {
  return <Link href={href} className="flex items-center gap-2 rounded-lg border border-dashed border-white/[.09] px-3 py-3 font-mono text-[10px] text-violet-300/80 hover:bg-violet-400/[.04]"><Plus className="h-3.5 w-3.5" />{label}</Link>;
}

function ContextSection({ label, children }: { label: string; children: React.ReactNode }) {
  return <section className="border-t border-white/[.055] px-6 py-6"><h3 className="mb-4 font-mono text-[9px] uppercase tracking-[.14em] text-zinc-500">{label}</h3>{children}</section>;
}
