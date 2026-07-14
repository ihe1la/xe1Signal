"use client";
import * as React from "react";
import Image from "next/image";
import { ChevronDown, ChevronLeft, ChevronRight, ExternalLink, ListMusic, Pause, Play, X } from "lucide-react";
import { usePlayer } from "./player-provider";
import { YouTubePlayer } from "./youtube-player";
import { SpotifyPlayer } from "./spotify-player";

export function GlobalPlayer() {
  const player = usePlayer(); const [expanded, setExpanded] = React.useState(true); const [unavailable, setUnavailable] = React.useState(false);
  React.useEffect(() => setUnavailable(false), [player.current?.signalId]);
  if (!player.current || !player.isOpen) return null;
  const item = player.current;
  return <section aria-label="Global media player" className="fixed inset-x-3 bottom-[76px] z-[80] mx-auto max-w-3xl overflow-hidden rounded-xl border border-white/10 bg-[#101116]/95 shadow-2xl backdrop-blur-xl lg:bottom-4 lg:left-[292px]">
    {expanded && <div className="border-b border-white/[.07] bg-black/30">
      {!unavailable && item.provider === "youtube" && <YouTubePlayer videoId={item.externalId} playing={player.isPlaying} onPlayingChange={(value) => value !== player.isPlaying && player.toggle()} onUnavailable={() => setUnavailable(true)} />}
      {!unavailable && item.provider === "spotify" && <SpotifyPlayer uri={item.providerUri || item.canonicalUrl} playing={player.isPlaying} onPlayingChange={(value) => value !== player.isPlaying && player.toggle()} onUnavailable={() => setUnavailable(true)} />}
      {unavailable && <div className="grid min-h-36 place-items-center p-6 text-center"><div><p className="font-mono text-xs text-zinc-300">This item is unavailable in the embedded player.</p><a href={item.canonicalUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 font-mono text-[10px] text-violet-300">Open on {item.provider === "youtube" ? "YouTube" : "Spotify"}<ExternalLink className="h-3 w-3" /></a></div></div>}
    </div>}
    <div className="flex items-center gap-2 px-3 py-2.5">
      {item.thumbnailUrl ? <Image src={item.thumbnailUrl} alt="" width={44} height={44} className="h-11 w-11 rounded-lg object-cover" /> : <span className="h-11 w-11 rounded-lg bg-white/[.04]" />}
      <div className="min-w-0 flex-1"><p className="truncate font-mono text-[11px] text-zinc-200">{item.title}</p><p className="mt-1 truncate font-mono text-[9px] uppercase text-zinc-600">{item.creator || item.provider} · {item.entityType}</p></div>
      <button onClick={player.previous} className="hidden rounded p-2 text-zinc-500 hover:text-zinc-200 sm:block" aria-label="Previous"><ChevronLeft className="h-4 w-4" /></button>
      <button onClick={player.toggle} className="grid h-9 w-9 place-items-center rounded-full border border-violet-300/40 text-violet-200" aria-label={player.isPlaying ? "Pause" : "Play"}>{player.isPlaying ? <Pause className="h-3.5 w-3.5 fill-current" /> : <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />}</button>
      <button onClick={player.next} className="hidden rounded p-2 text-zinc-500 hover:text-zinc-200 sm:block" aria-label="Next"><ChevronRight className="h-4 w-4" /></button>
      <span title={`${player.queue.length} queued`} className="hidden p-2 text-zinc-600 sm:block"><ListMusic className="h-4 w-4" /></span>
      <button onClick={() => setExpanded((value) => !value)} className="rounded p-2 text-zinc-500 hover:text-zinc-200" aria-label={expanded ? "Minimize player" : "Expand player"}><ChevronDown className={`h-4 w-4 transition ${expanded ? "" : "rotate-180"}`} /></button>
      <button onClick={player.close} className="rounded p-2 text-zinc-600 hover:text-zinc-200" aria-label="Close player"><X className="h-4 w-4" /></button>
    </div>
  </section>;
}
