"use client";

import * as React from "react";
import Link from "next/link";
import { Pause, Play, Share2, Volume2, VolumeX, X } from "lucide-react";
import { ShareMenu } from "@/components/share-menu";
import type { AudioTrack } from "./audio-player-provider";

export function AudioPlayerControls({ current, playing, progress, duration, volume, muted, toggle, close, seek, setVolume, setMuted }: {
  current: AudioTrack;
  playing: boolean;
  progress: number;
  duration: number;
  volume: number;
  muted: boolean;
  toggle: () => Promise<void>;
  close: () => void;
  seek: (progress: number) => void;
  setVolume: React.Dispatch<React.SetStateAction<number>>;
  setMuted: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const [sharing, setSharing] = React.useState(false);
  return <div className="fixed inset-x-3 bottom-[76px] z-[70] mx-auto flex max-w-2xl items-center gap-3 rounded-xl border border-white/[.1] bg-[#111218]/95 px-3 py-2.5 shadow-2xl backdrop-blur-xl lg:bottom-4">
      <button onClick={toggle} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-violet-300/50 text-violet-200" aria-label={playing ? "Pause global player" : "Play global player"}>{playing ? <Pause className="h-3.5 w-3.5 fill-current" /> : <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />}</button>
      {current.href ? <a href={current.href} target="_blank" rel="noreferrer" className="min-w-0 w-32 sm:w-44"><span className="block truncate font-mono text-[11px] text-zinc-200">{current.title}</span><span className="mt-1 block truncate font-mono text-[9px] text-zinc-500">{current.artist || "Signal Archive"}</span></a> : current.signalId ? <Link href={`/signals/${current.signalId}`} className="min-w-0 w-32 sm:w-44"><span className="block truncate font-mono text-[11px] text-zinc-200">{current.title}</span><span className="mt-1 block truncate font-mono text-[9px] text-zinc-500">{current.artist || "Signal Archive"}</span></Link> : <div className="min-w-0 w-32 sm:w-44"><span className="block truncate font-mono text-[11px] text-zinc-200">{current.title}</span><span className="mt-1 block truncate font-mono text-[9px] text-zinc-500">{current.artist || "Signal Archive"}</span></div>}
      <input aria-label="Audio progress" type="range" min={0} max={1000} value={Math.round(progress * 1000)} onChange={(event) => { seek(Number(event.target.value) / 1000); }} className="h-1 min-w-0 flex-1 accent-violet-400" />
      <span className="hidden w-10 text-right font-mono text-[9px] text-zinc-500 sm:block">{formatDuration(duration)}</span>
      <div className="hidden items-center gap-2 sm:flex">
        <button onClick={() => setMuted((value) => !value)} className="rounded-md p-1 text-zinc-500 hover:text-violet-300" aria-label={muted ? "Unmute audio" : "Mute audio"}>{muted || volume === 0 ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}</button>
        <input aria-label="Audio volume" title={`Volume ${Math.round(volume * 100)}%`} type="range" min={0} max={100} value={Math.round(volume * 100)} onChange={(event) => { const value = Number(event.target.value) / 100; setVolume(value); setMuted(value === 0); window.localStorage.setItem("signal-audio-volume", String(value)); }} className="h-1 w-20 accent-violet-400" />
      </div>
      <button onClick={()=>setSharing(value=>!value)} className="rounded-md p-2 text-zinc-500 hover:bg-white/5 hover:text-violet-300" aria-label="Share now playing"><Share2 className="h-4 w-4"/></button>
      <button onClick={() => setMuted((value) => !value)} className="rounded-md p-2 text-zinc-500 sm:hidden" aria-label={muted ? "Unmute audio" : "Mute audio"}>{muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}</button>
      <button onClick={close} className="rounded-md p-2 text-zinc-600 hover:bg-white/5 hover:text-zinc-200" aria-label="Close audio player"><X className="h-4 w-4" /></button>
      {sharing&&<ShareMenu title={current.title} sourceUrl={current.href} signalUrl={current.signalId ? `/signals/${current.signalId}` : "/vibe"} onClose={() => setSharing(false)} className="absolute bottom-full right-0 mb-2 w-72" />}
    </div>;
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "--:--";
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}
