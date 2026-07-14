"use client";

import * as React from "react";
import Link from "next/link";
import { Bookmark, Check, Copy, Download, ExternalLink, FileText, MessageCircle, MoreHorizontal, Pause, Play, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAudioPlayer } from "@/components/audio-player-provider";

type CardSignal = {
  id: string; type: string; title?: string | null; content?: string | null; description?: string | null; sourceUrl?: string | null; sourceDomain?: string | null; previewImageUrl?: string | null;
  artist?: string; duration?: string; language?: string; tags?: string[]; visibility?: string; signalStrength?: number; reactionCount?: number; commentCount?: number; saveCount?: number; viewCount?: number;
  createdAt?: Date | string; updatedAt?: Date | string; isSaved?: boolean; isReacted?: boolean;
  owner: { id: string; name: string | null; username: string; avatarUrl: string | null };
  frequency?: { id: string; name: string } | null;
  files?: { id: string; url: string; filename: string; originalName: string; thumbnailUrl?: string | null; mimeType: string; size: number; width?: number | null; height?: number | null; duration?: number | null }[];
};

export function SignalCard({ signal, variant = "default", onSave, onReact }: { signal: CardSignal; variant?: "default" | "compact" | "featured"; showFrequency?: boolean; onSave?: (id: string) => void; onReact?: (id: string, type: string) => void; onShare?: (id: string) => void; onReport?: (id: string) => void; onEdit?: (id: string) => void; onDelete?: (id: string) => void }) {
  const [saved, setSaved] = React.useState(Boolean(signal.isSaved));
  const [reacted, setReacted] = React.useState(Boolean(signal.isReacted));
  const [copied, setCopied] = React.useState(false);
  const newestFiles = [...(signal.files || [])].reverse();
  const imageFile = newestFiles.find((file) => file.mimeType.startsWith("image/"));
  const audioFile = newestFiles.find((file) => file.mimeType.startsWith("audio/"));
  const documentFile = newestFiles.find((file) => !file.mimeType.startsWith("image/") && !file.mimeType.startsWith("audio/"));
  const image = signal.previewImageUrl || imageFile?.thumbnailUrl || imageFile?.url;

  async function copyCode() {
    await navigator.clipboard.writeText(signal.content || "");
    setCopied(true); window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <article className={cn("signal-archive-card group relative mb-4 inline-block w-full overflow-hidden rounded-[11px] border border-white/[.075] bg-[#0d0e13] align-top shadow-[0_18px_50px_rgba(0,0,0,.12)] transition duration-300 hover:-translate-y-0.5 hover:border-white/[.13]", variant === "compact" && "flex") }>
      <div className="absolute left-4 top-3 z-10 font-mono text-[9px] uppercase tracking-wide text-zinc-500">{signal.type === "AUDIO" ? "VOICE" : signal.type}</div>
      {(signal.type === "IMAGE" || signal.type === "SCREENSHOT") && <Link href={`/signals/${signal.id}`} className="block h-[158px] overflow-hidden bg-zinc-900"><img src={image || ""} alt={signal.title || "Signal"} className="h-full w-full object-cover opacity-75 grayscale-[.35] transition duration-500 group-hover:scale-[1.025] group-hover:opacity-90" /></Link>}
      {signal.type === "LINK" && image && <Link href={`/signals/${signal.id}`} className="block h-[158px] overflow-hidden"><img src={image} alt="" className="h-full w-full object-cover opacity-70 grayscale-[.25] transition duration-500 group-hover:scale-[1.025]" /></Link>}
      {signal.type === "CODE" && <div className="relative h-[178px] overflow-hidden bg-[#0a0b10] px-5 pb-4 pt-12"><button onClick={copyCode} className="absolute right-3 top-3 z-10 rounded-md p-1.5 text-zinc-600 hover:bg-white/5 hover:text-zinc-300" aria-label="Copy code">{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}</button><pre className="overflow-hidden whitespace-pre-wrap break-words font-mono text-[9px] leading-[1.55] text-zinc-400"><code>{signal.content}</code></pre><div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#0a0b10]" /></div>}
      {signal.type === "NOTE" && <Link href={`/signals/${signal.id}`} className="block min-h-[198px] px-5 pb-7 pt-16"><p className="max-w-[18ch] font-mono text-[17px] leading-[1.35] text-zinc-200">{signal.title}</p></Link>}
      {(signal.type === "DOCUMENT" || signal.type === "FILE") && <div className="flex min-h-[150px] items-center gap-4 px-6 pt-6"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[.03]"><FileText className="h-5 w-5 text-violet-300" /></span><span className="min-w-0 flex-1"><Link href={`/signals/${signal.id}`} className="block truncate font-mono text-sm text-zinc-200">{signal.title}</Link><small className="mt-2 block truncate font-mono text-[10px] text-zinc-600">{documentFile?.originalName || "Saved document"}</small></span>{documentFile && <a href={`${documentFile.url}?download=1`} className="rounded-lg border border-white/[.08] p-2.5 text-zinc-500 hover:text-violet-300" aria-label={`Download ${documentFile.originalName}`}><Download className="h-4 w-4" /></a>}</div>}
      {(signal.type === "SONG" || signal.type === "AUDIO") && <div className="min-h-[190px] px-5 pb-5 pt-14"><Link href={`/signals/${signal.id}`} className="font-mono text-[14px] text-zinc-200">{signal.title}</Link><p className="mt-2 truncate font-mono text-[10px] text-zinc-500">{signal.artist || signal.description || audioFile?.originalName}</p><AudioPlayer signalId={signal.id} title={signal.title || "Untitled audio"} artist={signal.artist || signal.description || audioFile?.originalName} src={audioFile?.url} externalUrl={signal.sourceUrl||undefined} fallbackDuration={signal.duration} /></div>}
      {!(["IMAGE", "SCREENSHOT", "LINK", "CODE", "NOTE", "DOCUMENT", "FILE", "SONG", "AUDIO"].includes(signal.type)) && <div className="min-h-[150px] px-5 pt-14"><p>{signal.title}</p></div>}

      {(["IMAGE", "SCREENSHOT", "LINK"].includes(signal.type)) && <div className={cn("px-5 pb-5", signal.type === "LINK" && !image ? "pt-12" : "pt-4")}><Link href={`/signals/${signal.id}`} className="font-mono text-[13px] text-zinc-200 hover:text-white">{signal.title}</Link>{signal.description && <p className="mt-2 line-clamp-1 font-mono text-[10px] text-zinc-500">{signal.description}</p>}{signal.sourceDomain && <p className="mt-2 font-mono text-[10px] text-zinc-500">{signal.sourceDomain}</p>}</div>}
      {signal.type === "CODE" && <div className="px-5 pb-4 pt-3"><Link href={`/signals/${signal.id}`} className="font-mono text-[12px] text-zinc-200">{signal.title}</Link></div>}
      <footer className="flex h-10 items-center border-t border-white/[.06] px-4 font-mono text-[10px] text-zinc-500">
        <Link href={`/profile/${signal.owner.username}`} className="hover:text-zinc-200">{signal.owner.username}</Link>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => { setReacted(!reacted); onReact?.(signal.id, "STAR"); }} className={cn("flex items-center gap-1 rounded p-1.5 hover:bg-white/5", reacted && "text-amber-400")} aria-label="React"><Star className={cn("h-3.5 w-3.5", reacted && "fill-current")} /><span>{(signal.reactionCount || 0) + (reacted && !signal.isReacted ? 1 : 0)}</span></button>
          <Link href={`/signals/${signal.id}#comments`} className="flex items-center gap-1 rounded p-1.5 hover:bg-white/5" aria-label="Comments"><MessageCircle className="h-3.5 w-3.5" /><span>{signal.commentCount || 0}</span></Link>
          <button onClick={() => { setSaved(!saved); onSave?.(signal.id); }} className={cn("flex items-center gap-1 rounded p-1.5 hover:bg-white/5", saved && "text-violet-300")} aria-label="Save"><Bookmark className={cn("h-3.5 w-3.5", saved && "fill-current")} /><span>{(signal.saveCount || 0) + (saved && !signal.isSaved ? 1 : 0)}</span></button>
          {signal.sourceUrl ? <a href={signal.sourceUrl} target="_blank" rel="noreferrer" className="rounded p-1.5 hover:bg-white/5" aria-label="Open source"><ExternalLink className="h-3.5 w-3.5" /></a> : <Link href={`/signals/${signal.id}`} className="rounded p-1.5 hover:bg-white/5" aria-label="More"><MoreHorizontal className="h-3.5 w-3.5" /></Link>}
        </div>
      </footer>
    </article>
  );
}

function AudioPlayer({ signalId, title, artist, src, externalUrl, fallbackDuration }: { signalId: string; title: string; artist?: string; src?: string; externalUrl?: string; fallbackDuration?: string }) {
  const player = useAudioPlayer();
  const active = Boolean(src && player.current?.src === src);
  const playing = active && player.playing;
  const progress = active ? player.progress : 0;
  const duration = active ? player.duration : 0;

  return <div className="mt-7 flex items-center gap-3">
    {src?<button onClick={() => player.playTrack({ id: `${signalId}:${src}`, signalId, title, artist, src }).catch(() => undefined)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-violet-300/70 text-zinc-200" aria-label={playing ? "Pause" : "Play"}>{playing ? <Pause className="h-3.5 w-3.5 fill-current" /> : <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />}</button>:externalUrl?<ExternalMusicPlayer url={externalUrl}/>:<button disabled className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-zinc-700 text-zinc-700" aria-label="No audio file"><Play className="h-3.5 w-3.5"/></button>}
    <Wave progress={progress} />
    <span className="font-mono text-[9px] text-zinc-500">{duration ? formatDuration(duration) : fallbackDuration || "--:--"}</span>
  </div>;
}

function ExternalMusicPlayer({url}:{url:string}){
  const [open,setOpen]=React.useState(false);
  const embed=getMusicEmbed(url);
  if(!embed)return <a href={url} target="_blank" rel="noreferrer" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-violet-300/70 text-zinc-200" aria-label="Open music link"><ExternalLink className="h-3.5 w-3.5"/></a>;
  return <><button onClick={()=>setOpen(value=>!value)} className="grid h-9 shrink-0 place-items-center rounded-full border border-violet-300/70 px-3 font-mono text-[9px] text-zinc-200" aria-label={open?"Close embedded player":"Play here"}><Play className="mr-1.5 inline h-3 w-3 fill-current"/>{open?"Close":"Play here"}</button>{open&&<div className="absolute inset-x-3 top-12 z-30 overflow-hidden rounded-xl border border-white/10 bg-[#090a0e] shadow-2xl"><iframe title="Embedded music player" src={embed.url} className={embed.kind==="youtube"?"aspect-video w-full":"h-[152px] w-full"} allow="autoplay; encrypted-media; clipboard-write; picture-in-picture" allowFullScreen loading="lazy"/></div>}</>;
}

function getMusicEmbed(value:string):{url:string;kind:"spotify"|"youtube"}|null{
  try{
    const url=new URL(value);
    const host=url.hostname.replace(/^www\./,"");
    if(host==="open.spotify.com"){
      const match=url.pathname.match(/^\/(track|album|playlist|episode|show)\/([A-Za-z0-9]+)/);
      if(match)return {url:`https://open.spotify.com/embed/${match[1]}/${match[2]}?utm_source=generator&theme=0`,kind:"spotify"};
    }
    if(host==="youtu.be"){
      const id=url.pathname.split("/")[1];
      if(/^[\w-]{6,20}$/.test(id))return {url:`https://www.youtube-nocookie.com/embed/${id}`,kind:"youtube"};
    }
    if(["youtube.com","music.youtube.com"].includes(host)){
      const id=url.pathname.startsWith("/shorts/")?url.pathname.split("/")[2]:url.searchParams.get("v");
      if(id&&/^[\w-]{6,20}$/.test(id))return {url:`https://www.youtube-nocookie.com/embed/${id}`,kind:"youtube"};
    }
  }catch{}
  return null;
}

function Wave({ progress }: { progress: number }) {
  const heights = [3,5,8,12,16,20,13,8,14,18,11,7,15,19,13,9,6,11,14,8,5,9,12,7,4,8,10,6];
  return <span className="flex h-8 flex-1 items-center gap-[2px] overflow-hidden">{heights.map((height, index) => <i key={index} className={cn("w-[2px] shrink-0 rounded-full bg-zinc-700", index / heights.length <= progress && "bg-violet-400")} style={{height: `${height}px`}} />)}</span>;
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}
