"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowRight, Check, Pencil, SunMedium, X } from "lucide-react";
import { MOOD_SYMBOLS } from "@/lib/mood-symbols";

type SidebarData = {
  profile: { username: string; name: string; avatarUrl: string | null; strength: number } | null;
  activeFrequency: { id: string; name: string; signalCount: number } | null;
  recentSignal: { id: string; title: string | null; previewImageUrl: string | null; createdAt: string } | null;
  recentTrail: { id: string; title: string; nodeCount: number; nodes: { id: string; title: string | null }[] } | null;
};

export function StrengthBars({ value = 76 }: { value?: number }) {
  return (
    <span className="flex items-end gap-[3px]" aria-label={`Signal strength ${value}`}>
      {[1, 20, 40, 60, 80].map((level, index) => (
        <i
          key={level}
          className="block w-[3px] rounded-[1px]"
          style={{
            height: `${4 + index * 2}px`,
            background: value >= level ? "#8f7be9" : "#24242e",
          }}
        />
      ))}
    </span>
  );
}

export function RightSidebar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [data, setData] = React.useState<SidebarData>({
    profile: null,
    activeFrequency: null,
    recentSignal: null,
    recentTrail: null,
  });
  const username = data.profile?.username || session?.user?.username || "hela";
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
      fetch("/api/user/mood").then((response) => (response.ok ? response.json() : null)),
      fetch("/api/sidebar").then((response) => (response.ok ? response.json() : null)),
    ])
      .then(([moodData, sidebarData]) => {
        if (!active) return;
        if (moodData?.mood) {
          setMood(moodData.mood);
          setDraftMood(moodData.mood);
          setSymbol(moodData.symbol || "🌙");
          setDraftSymbol(moodData.symbol || "🌙");
        }
        if (sidebarData) setData(sidebarData);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [pathname, session?.user?.id, status]);

  async function saveMood() {
    const value = draftMood.trim();
    const nextSymbol = draftSymbol.trim();
    if (!value || !nextSymbol) return;
    setSavingMood(true);
    const response = await fetch("/api/user/mood", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mood: value, symbol: nextSymbol }),
    });
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

  const activeFrequency = data.activeFrequency || {
    id: "sample-ihe1la-songs-that-hurt",
    name: "Songs that hurt",
    signalCount: 2,
  };
  const recentTrail = data.recentTrail || {
    id: "sample-ihe1la-first-trail",
    title: "My first trail",
    nodeCount: 0,
    nodes: [],
  };
  const recentSignal = data.recentSignal || {
    id: "sample-ihe1la-blue",
    title: "BLUE",
    previewImageUrl:
      "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&w=200&q=80",
    createdAt: new Date().toISOString(),
  };

  return (
    <aside className="fixed bottom-0 right-0 top-20 z-20 hidden w-[280px] border-l border-white/[.055] bg-[#08090d] 2xl:block">
      <div className="scrollbar-thin h-full overflow-y-auto px-3.5 py-4">
        <div className="overflow-hidden rounded-[12px] border border-white/[.06] bg-white/[.015]">
          <section className="px-4 pb-4 pt-5">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={username}
                className="mb-3 h-12 w-12 rounded-full border border-white/10 bg-black object-cover"
              />
            ) : (
              <span className="mb-3 grid h-12 w-12 place-items-center rounded-full border border-white/10 bg-white/[.04] font-mono text-sm text-zinc-400">
                {username.slice(0, 1).toUpperCase()}
              </span>
            )}
            <p className="font-mono text-[14px] text-zinc-100">{name}</p>
            <p className="mt-0.5 font-mono text-[10px] text-zinc-600">@{username}</p>
            <div className="mt-3 flex items-center gap-2.5 font-mono text-[9px] uppercase tracking-[.08em] text-zinc-600">
              <span>signal strength</span>
              <StrengthBars value={data.profile?.strength || 84} />
            </div>
          </section>

          <ContextSection label="Active frequency">
            <Link
              href={`/frequencies/${activeFrequency.id}`}
              className="flex items-center gap-3 rounded-lg border border-white/[.06] bg-white/[.03] px-3 py-2.5"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-mono text-[12px] text-zinc-100">
                  {activeFrequency.name}
                </span>
                <span className="mt-1 block font-mono text-[9px] text-zinc-600">
                  {activeFrequency.signalCount} signals
                </span>
              </span>
              <StrengthBars value={Math.min(100, Math.max(20, activeFrequency.signalCount * 18))} />
            </Link>
          </ContextSection>

          <ContextSection label="Current mood">
            {editingMood ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5" aria-label="Choose a mood symbol">
                  {MOOD_SYMBOLS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setDraftSymbol(item)}
                      aria-label={`Use ${item}`}
                      aria-pressed={draftSymbol === item}
                      className={`grid h-7 w-7 place-items-center rounded-md border text-sm grayscale brightness-50 ${
                        draftSymbol === item
                          ? "border-violet-400/50 bg-violet-400/10"
                          : "border-white/[.07] bg-white/[.02]"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
                <input
                  maxLength={60}
                  value={draftMood}
                  onChange={(event) => setDraftMood(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void saveMood();
                    if (event.key === "Escape") cancelMood();
                  }}
                  className="h-8 w-full rounded-lg border border-white/[.09] bg-white/[.025] px-3 font-mono text-[11px] text-zinc-200 outline-none focus:border-violet-400/30"
                  aria-label="Current mood"
                />
                <div className="flex justify-end gap-1.5">
                  <button onClick={cancelMood} className="rounded-md p-1.5 text-zinc-600" aria-label="Cancel mood edit">
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <button
                    disabled={savingMood || !draftMood.trim() || !draftSymbol.trim()}
                    onClick={() => void saveMood()}
                    className="rounded-md bg-violet-400/[.12] p-1.5 text-violet-300 disabled:opacity-40"
                    aria-label="Save mood"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 rounded-full border border-white/[.06] bg-white/[.025] px-3 py-1.5 font-mono text-[11px] text-zinc-300">
                  {mood}
                </span>
                <span className="text-sm grayscale brightness-50" aria-label={`Mood symbol ${symbol}`}>
                  {symbol}
                </span>
                <button
                  type="button"
                  onClick={() => setEditingMood(true)}
                  className="rounded-md p-1.5 text-zinc-600 hover:bg-white/5 hover:text-zinc-300"
                  aria-label="Mood accent"
                >
                  <SunMedium className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditingMood(true)}
                  className="rounded-md p-1.5 text-zinc-600 hover:bg-white/5 hover:text-violet-300"
                  aria-label="Edit current mood"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </ContextSection>

          <ContextSection label="Recent trail">
            <Link
              href={`/trails/${recentTrail.id}/edit`}
              className="block rounded-lg border border-white/[.06] bg-white/[.02] px-3 py-2.5"
            >
              <span className="block font-mono text-[11px] text-zinc-200">{recentTrail.title}</span>
              <small className="mt-1.5 block font-mono text-[9px] text-zinc-600">
                {recentTrail.nodeCount
                  ? `${recentTrail.nodeCount} nodes · continue editing`
                  : "Empty trail · add your first node"}
              </small>
            </Link>
          </ContextSection>

          <ContextSection label="Recent signal">
            <Link href={`/signals/${recentSignal.id}`} className="flex items-center gap-2.5">
              {recentSignal.previewImageUrl ? (
                <img
                  src={recentSignal.previewImageUrl}
                  alt=""
                  className="h-11 w-14 shrink-0 rounded-md border border-white/10 object-cover"
                />
              ) : (
                <span className="grid h-11 w-14 shrink-0 place-items-center rounded-md border border-white/10 bg-white/[.03] font-mono text-[8px] uppercase tracking-wide text-zinc-600">
                  Signal
                </span>
              )}
              <span className="min-w-0 font-mono text-[11px] leading-5 text-zinc-300">
                <span className="block truncate">{recentSignal.title || "Untitled signal"}</span>
                <small className="block text-zinc-600">Recently created</small>
              </span>
            </Link>
          </ContextSection>

          <Link
            href={`/profile/${username}`}
            className="flex items-center gap-2 px-4 py-4 font-mono text-[9px] uppercase tracking-wider text-zinc-600 hover:text-zinc-200"
          >
            View profile <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </aside>
  );
}

function ContextSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-white/[.05] px-4 py-3.5">
      <h3 className="mb-2.5 font-mono text-[9px] uppercase tracking-[.14em] text-zinc-600">{label}</h3>
      {children}
    </section>
  );
}
