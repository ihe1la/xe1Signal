"use client";

import * as React from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowRight, Check, Moon, Pencil, X } from "lucide-react";
import { demoTrail } from "@/lib/demo-data";

export function StrengthBars({ value = 76 }: { value?: number }) {
  return <span className="flex items-end gap-1" aria-label={`Signal strength ${value}`}>{[20,35,50,65,80,95].map((level, index) => <i key={level} className="block w-1 rounded-sm" style={{height: `${5 + index * 2}px`, background: value >= level ? "#8f7be9" : "#24242e"}} />)}</span>;
}

export function RightSidebar() {
  const { data: session, status } = useSession();
  const username = session?.user?.username || "hela";
  const avatarUrl = session?.user?.avatarUrl || `https://api.dicebear.com/9.x/notionists-neutral/svg?seed=${username}&backgroundColor=111116`;
  const [mood, setMood] = React.useState("low light / private");
  const [draftMood, setDraftMood] = React.useState(mood);
  const [editingMood, setEditingMood] = React.useState(false);
  const [savingMood, setSavingMood] = React.useState(false);

  React.useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return;
    let active = true;
    fetch("/api/user/mood").then((response) => response.ok ? response.json() : null).then((data) => { if (active && data?.mood) { setMood(data.mood); setDraftMood(data.mood); } }).catch(() => undefined);
    return () => { active = false; };
  }, [session?.user?.id, status]);

  async function saveMood() {
    const value = draftMood.trim(); if (!value) return;
    setSavingMood(true);
    const response = await fetch("/api/user/mood", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ mood: value }) });
    setSavingMood(false);
    if (response.ok) { setMood(value); setDraftMood(value); setEditingMood(false); }
  }
  return (
    <aside className="fixed bottom-0 right-0 top-20 z-20 hidden w-[304px] border-l border-white/[.055] bg-[#08090d] 2xl:block">
      <div className="scrollbar-thin h-full overflow-y-auto p-4">
        <div className="overflow-hidden rounded-[11px] border border-white/[.065] bg-gradient-to-br from-white/[.025] to-transparent">
          <section className="px-7 pb-7 pt-8">
            <img src={avatarUrl} alt={username} className="mb-4 h-[72px] w-[72px] rounded-full border border-white/10 bg-black object-cover grayscale" />
            <p className="font-mono text-[15px] text-zinc-100">{username}</p>
            <div className="mt-2 flex items-center gap-3 font-mono text-[11px] text-zinc-500"><span>signal strength</span><StrengthBars value={76} /></div>
          </section>
          <ContextSection label="Active frequency">
            <Link href="/frequencies/broken-flows" className="block rounded-lg bg-white/[.025] px-4 py-3"><span className="font-mono text-[13px] text-zinc-200">Broken flows</span><span className="mt-1 flex items-center justify-between font-mono text-[10px] text-zinc-600"><span>23 signals</span><StrengthBars value={64} /></span></Link>
          </ContextSection>
          <ContextSection label="Current mood">
            {editingMood ? <div className="space-y-3"><input autoFocus maxLength={60} value={draftMood} onChange={(event) => setDraftMood(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") saveMood(); if (event.key === "Escape") { setDraftMood(mood); setEditingMood(false); } }} className="h-9 w-full rounded-lg border border-white/[.09] bg-white/[.025] px-3 font-mono text-[11px] text-zinc-200 outline-none focus:border-violet-400/30" aria-label="Current mood"/><div className="flex justify-end gap-2"><button onClick={() => { setDraftMood(mood); setEditingMood(false); }} className="rounded-md p-2 text-zinc-600" aria-label="Cancel mood edit"><X className="h-3.5 w-3.5"/></button><button disabled={savingMood || !draftMood.trim()} onClick={saveMood} className="rounded-md bg-violet-400/[.12] p-2 text-violet-300 disabled:opacity-40" aria-label="Save mood"><Check className="h-3.5 w-3.5"/></button></div></div>:<div className="flex items-center justify-between gap-3 font-mono text-[11px] text-zinc-500"><span className="min-w-0 flex-1 break-words">{mood}</span><Moon className="h-7 w-7 shrink-0 fill-zinc-700 text-zinc-600" /><button onClick={() => setEditingMood(true)} className="rounded-md p-2 text-zinc-600 hover:bg-white/5 hover:text-violet-300" aria-label="Edit current mood"><Pencil className="h-3.5 w-3.5" /></button></div>}
          </ContextSection>
          <ContextSection label="Recent trail">
            <div className="relative space-y-3 before:absolute before:bottom-2 before:left-[3px] before:top-2 before:w-px before:bg-white/10">{demoTrail.map((item, index) => <Link href="/trails/oauth-login" key={item} className="relative flex items-center gap-4 font-mono text-[10px] text-zinc-400"><i className="z-10 h-[7px] w-[7px] rounded-full border border-[#08090d] bg-zinc-600 first:bg-violet-400" /><span className="truncate">{index ? "→  " : ""}{item}</span><span className="ml-auto text-zinc-700">{2 + index * 2}m</span></Link>)}</div>
          </ContextSection>
          <ContextSection label="Recent signal">
            <Link href="/signals/strange-redirect" className="flex gap-3"><img src="https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=200&q=70" alt="" className="h-14 w-[72px] rounded-md border border-white/10 object-cover grayscale" /><span className="font-mono text-[11px] leading-5 text-zinc-300">Strange redirect after login<small className="block text-zinc-600">2m ago</small></span></Link>
          </ContextSection>
          <Link href={`/profile/${username}`} className="flex items-center gap-2 px-7 py-6 font-mono text-[9px] uppercase tracking-wider text-zinc-500 hover:text-zinc-200">View profile <ArrowRight className="h-3 w-3" /></Link>
        </div>
      </div>
    </aside>
  );
}

function ContextSection({ label, children }: { label: string; children: React.ReactNode }) {
  return <section className="border-t border-white/[.055] px-6 py-6"><h3 className="mb-4 font-mono text-[9px] uppercase tracking-[.14em] text-zinc-500">{label}</h3>{children}</section>;
}
