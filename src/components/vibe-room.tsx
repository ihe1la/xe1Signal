"use client";

import * as React from "react";
import { Headphones, Link2, LoaderCircle, Pause, Play, Radio, SkipForward, Trash2, X } from "lucide-react";

import { useAudioPlayer } from "@/components/audio-player-provider";
import type { VibeQueuePayload, VibeSnapshot } from "@/lib/vibe-server";

export function VibeRoom() {
  const [snapshot, setSnapshot] = React.useState<VibeSnapshot | null>(null);
  const [url, setUrl] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [playbackBlocked, setPlaybackBlocked] = React.useState(false);
  const player = useAudioPlayer();
  const playerRef = React.useRef(player);
  const controlRef = React.useRef<(action: VibeAction, itemId?: string) => Promise<void>>(() => Promise.resolve());
  const nowPlayingRef = React.useRef<VibeQueuePayload | null>(null);
  const roomPlayingRef = React.useRef(false);
  playerRef.current = player;
  nowPlayingRef.current = snapshot?.nowPlaying || null;
  roomPlayingRef.current = snapshot?.room.isPlaying || false;

  const loadSnapshot = React.useCallback(async () => {
    try {
      const response = await fetch("/api/vibe", { cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Vibe state is unavailable");
      setSnapshot(data);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Vibe state is unavailable");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let active = true;
    const load = async () => { if (active) await loadSnapshot(); };
    void load();
    const source = new EventSource("/api/vibe/events");
    source.addEventListener("vibe", () => { void load(); });
    source.onerror = () => { source.close(); };
    const poll = window.setInterval(() => { void load(); }, 3_000);
    return () => { active = false; source.close(); window.clearInterval(poll); };
  }, [loadSnapshot]);

  const sendControl = React.useCallback(async (action: VibeAction, itemId?: string) => {
    const response = await fetch("/api/vibe/control", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, ...(itemId ? { itemId } : {}) }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.error || "Vibe control failed");
    setSnapshot(data);
    setError(null);
  }, []);
  controlRef.current = sendControl;

  React.useEffect(() => {
    const item = nowPlayingRef.current;
    if (!item?.fileUrl) {
      if (playerRef.current.current?.id.startsWith("vibe:")) playerRef.current.stop();
      return;
    }
    const track = {
      id: `vibe:${item.id}`,
      title: item.title,
      artist: item.artists.join(", ") || "Unknown artist",
      src: item.fileUrl,
      href: "/vibe",
      onToggle: () => { void controlRef.current(roomPlayingRef.current ? "pause" : "play", item.id).catch((cause) => setError(cause instanceof Error ? cause.message : "Could not update playback")); },
    };
    setPlaybackBlocked(false);
    playerRef.current.playTrack(track, {
      autoplay: roomPlayingRef.current,
      onEnded: () => { void controlRef.current("skip", item.id).catch((cause) => setError(cause instanceof Error ? cause.message : "Could not skip the finished track")); },
    }).catch(() => setPlaybackBlocked(true));
  }, [snapshot?.room.currentItemId, snapshot?.room.isPlaying, snapshot?.nowPlaying?.fileUrl, snapshot?.nowPlaying?.title, snapshot?.nowPlaying?.artists]);

  async function queueUrl(event: React.FormEvent) {
    event.preventDefault();
    if (!url.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/vibe/queue", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "This link could not be queued");
      setSnapshot(data);
      setUrl("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "This link could not be queued");
    } finally {
      setSubmitting(false);
    }
  }

  async function removeItem(itemId: string) {
    try {
      const response = await fetch(`/api/vibe/queue/${encodeURIComponent(itemId)}`, { method: "DELETE" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Could not remove this track");
      setSnapshot(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not remove this track");
    }
  }

  const nowPlaying = snapshot?.nowPlaying;
  const currentId = snapshot?.room.currentItemId || undefined;

  return <div className="mx-auto max-w-5xl">
    <header className="mb-8 flex flex-col gap-4 border-b border-white/[.06] pb-7 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[.18em] text-violet-400">Shared room · main</p>
        <h1 className="font-mono text-[30px] leading-tight tracking-tight text-zinc-100 sm:text-[36px]">Vibe, together.</h1>
        <p className="mt-2 max-w-xl font-mono text-[11px] leading-6 text-zinc-500">Paste a YouTube, Spotify, or SoundCloud link. Unstream prepares the audio once, then everyone hears the same shared queue. Click any ready track to play it.</p>
      </div>
      <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.14em] text-zinc-600"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> shared state</div>
    </header>

    <form onSubmit={queueUrl} className="mb-6 rounded-2xl border border-white/[.08] bg-white/[.025] p-3 shadow-2xl shadow-black/10 sm:flex sm:items-center sm:gap-3">
      <div className="flex min-w-0 flex-1 items-center gap-3 px-2"><Link2 className="h-4 w-4 shrink-0 text-violet-300" /><input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="Paste a music link to add it to the room" className="min-w-0 flex-1 bg-transparent py-3 font-mono text-[11px] text-zinc-200 outline-none placeholder:text-zinc-700" aria-label="Music link" /></div>
      <button type="submit" disabled={submitting || !url.trim()} className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-400/[.16] px-5 font-mono text-[10px] text-violet-200 transition hover:bg-violet-400/[.24] disabled:cursor-not-allowed disabled:opacity-50 sm:mt-0 sm:w-auto">{submitting ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Radio className="h-3.5 w-3.5" />} {submitting ? "Preparing audio" : "Add to vibe"}</button>
    </form>

    {error && <div className="mb-6 flex items-start gap-3 rounded-xl border border-rose-400/20 bg-rose-400/[.06] px-4 py-3 font-mono text-[10px] leading-5 text-rose-200"><span className="flex-1">{error}</span><button onClick={() => setError(null)} aria-label="Dismiss error"><X className="h-3.5 w-3.5 text-rose-300/70" /></button></div>}

    {loading ? <LoadingVibe /> : <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]">
      <section className="rounded-2xl border border-white/[.07] bg-white/[.018]" aria-label="Vibe queue">
        <div className="flex items-center justify-between border-b border-white/[.06] px-5 py-4"><div><p className="font-mono text-[10px] uppercase tracking-[.14em] text-zinc-500">Room queue</p><p className="mt-1 font-mono text-[9px] text-zinc-700">{snapshot?.queue.length || 0} track{snapshot?.queue.length === 1 ? "" : "s"} · tap ready to play</p></div>{snapshot?.queue.length ? <button onClick={() => void sendControl("clear").catch((cause) => setError(cause instanceof Error ? cause.message : "Could not clear the queue"))} className="font-mono text-[9px] uppercase tracking-wider text-zinc-600 transition hover:text-rose-300">Clear all</button> : null}</div>
        {snapshot?.queue.length ? <ol className="divide-y divide-white/[.045]">{snapshot.queue.map((item) => <QueueRow key={item.id} item={item} active={item.id === currentId} onSelect={() => void sendControl("select", item.id).catch((cause) => setError(cause instanceof Error ? cause.message : "Could not play this track"))} onRemove={() => void removeItem(item.id)} />)}</ol> : <div className="px-6 py-20 text-center"><Headphones className="mx-auto h-7 w-7 text-zinc-700" /><p className="mt-4 font-mono text-xs text-zinc-500">The room is quiet.</p><p className="mt-2 font-mono text-[10px] text-zinc-700">Add the first link and it will appear here.</p></div>}
      </section>

      <section className="h-fit rounded-2xl border border-violet-300/15 bg-[radial-gradient(circle_at_top,rgba(139,116,235,.12),transparent_62%)] p-5" aria-label="Now playing">
        <div className="mb-5 flex items-center justify-between"><p className="font-mono text-[10px] uppercase tracking-[.14em] text-violet-300/80">Now playing</p><span className="font-mono text-[9px] text-zinc-600">{snapshot?.room.isPlaying ? "live" : "paused"}</span></div>
        {nowPlaying ? <><div className="flex gap-4">{nowPlaying.cover ? <img src={nowPlaying.cover} alt="" className="h-20 w-20 rounded-xl border border-white/10 object-cover" /> : <div className="grid h-20 w-20 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[.04]"><Headphones className="h-6 w-6 text-zinc-600" /></div>}<div className="min-w-0 pt-1"><h2 className="truncate font-mono text-sm text-zinc-100">{nowPlaying.title}</h2><p className="mt-2 truncate font-mono text-[10px] text-zinc-500">{nowPlaying.artists.join(", ") || "Unknown artist"}</p><p className="mt-2 font-mono text-[9px] uppercase tracking-wider text-violet-300/70">{statusLabel(nowPlaying.status)}</p></div></div><div className="mt-6 flex items-center gap-2"><button onClick={() => void sendControl(snapshot.room.isPlaying ? "pause" : "play", nowPlaying.id).catch((cause) => setError(cause instanceof Error ? cause.message : "Could not update playback"))} className="grid h-11 w-11 place-items-center rounded-full border border-violet-300/40 text-violet-200" aria-label={snapshot.room.isPlaying ? "Pause vibe" : "Play vibe"}>{snapshot.room.isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="ml-0.5 h-4 w-4 fill-current" />}</button><button onClick={() => void sendControl("skip", nowPlaying.id).catch((cause) => setError(cause instanceof Error ? cause.message : "Could not skip this track"))} className="flex h-11 items-center gap-2 rounded-xl border border-white/[.08] px-4 font-mono text-[10px] text-zinc-400 transition hover:text-zinc-100" aria-label="Skip current track"><SkipForward className="h-3.5 w-3.5" /> Skip</button></div>{playbackBlocked && <p className="mt-4 font-mono text-[9px] leading-5 text-amber-200/70">This browser blocked autoplay. Press play once to start the shared audio here.</p>}</> : <div className="py-12 text-center"><Radio className="mx-auto h-6 w-6 text-zinc-700" /><p className="mt-4 font-mono text-xs text-zinc-500">Nothing is playing yet.</p><p className="mt-2 font-mono text-[10px] leading-5 text-zinc-700">When an audio file finishes, the next ready track starts for the room.</p></div>}
      </section>
    </div>}
    <p className="mt-6 text-center font-mono text-[9px] leading-5 text-zinc-700">Playback is served from Unstream-finished audio through the shared room relay. Browser autoplay rules may require one click per device.</p>
  </div>;
}

type VibeAction = "play" | "pause" | "skip" | "clear" | "select";

function QueueRow({ item, active, onSelect, onRemove }: { item: VibeQueuePayload; active: boolean; onSelect: () => void; onRemove: () => void }) {
  const playable = item.status === "ready" || item.status === "playing";
  return <li className={`flex items-center gap-3 px-5 py-4 transition ${active ? "bg-violet-400/[.06]" : playable ? "hover:bg-white/[.02]" : ""}`}>
    <button
      type="button"
      disabled={!playable}
      onClick={onSelect}
      className={`flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-not-allowed ${playable ? "cursor-pointer" : "opacity-70"}`}
      aria-label={playable ? (active ? `Playing ${item.title}` : `Play ${item.title}`) : `${item.title} is ${statusLabel(item.status)}`}
    >
      <span className="w-5 shrink-0 text-center font-mono text-[9px] text-zinc-700">{active ? <span className="mx-auto block h-1.5 w-1.5 rounded-full bg-violet-300" /> : item.position + 1}</span>
      {item.cover ? <img src={item.cover} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" /> : <div className="h-10 w-10 shrink-0 rounded-lg bg-white/[.04]" />}
      <div className="min-w-0 flex-1"><p className={`truncate font-mono text-[11px] ${active ? "text-violet-100" : "text-zinc-300"}`}>{item.title}</p><p className="mt-1 truncate font-mono text-[9px] text-zinc-600">{item.artists.join(", ") || "Unknown artist"}</p></div>
      <span className={`hidden shrink-0 font-mono text-[9px] uppercase tracking-wider sm:block ${item.status === "failed" ? "text-rose-300" : playable ? "text-emerald-300/70" : "text-zinc-600"}`}>{statusLabel(item.status)}</span>
    </button>
    <button type="button" onClick={onRemove} className="rounded-md p-2 text-zinc-700 transition hover:bg-white/[.05] hover:text-rose-300" aria-label={`Remove ${item.title}`}><Trash2 className="h-3.5 w-3.5" /></button>
  </li>;
}

function statusLabel(status: string) {
  if (status === "resolving") return "resolving";
  if (status === "downloading") return "downloading";
  if (status === "playing") return "playing";
  if (status === "failed") return "failed";
  return "ready";
}

function LoadingVibe() {
  return <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]"><div className="h-96 animate-pulse rounded-2xl border border-white/[.06] bg-white/[.02]" /><div className="h-72 animate-pulse rounded-2xl border border-white/[.06] bg-white/[.02]" /></div>;
}
