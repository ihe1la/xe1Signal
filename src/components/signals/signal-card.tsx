"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Bookmark,
  Check,
  Copy,
  Download,
  ExternalLink,
  FileText,
  MessageCircle,
  MoreHorizontal,
  Pause,
  Play,
  Share2,
  Star,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { useAudioPlayer } from "@/components/audio-player-provider";
import { usePlayer } from "@/components/player/player-provider";

type CardSignal = {
  id: string;
  type: string;
  title?: string | null;
  content?: string | null;
  description?: string | null;
  sourceUrl?: string | null;
  sourceDomain?: string | null;
  previewImageUrl?: string | null;
  mediaProvider?: "youtube" | "spotify" | "audius" | null;
  mediaEntityType?: string | null;
  externalId?: string | null;
  providerUri?: string | null;
  creatorName?: string | null;
  thumbnailUrl?: string | null;
  durationMs?: number | null;
  artist?: string;
  duration?: string;
  language?: string;
  tags?: string[];
  visibility?: string;
  signalStrength?: number;
  reactionCount?: number;
  commentCount?: number;
  saveCount?: number;
  viewCount?: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  isSaved?: boolean;
  isReacted?: boolean;
  owner: {
    id: string;
    name: string | null;
    username: string;
    avatarUrl: string | null;
  };
  frequency?: { id: string; name: string } | null;
  files?: {
    id: string;
    url: string;
    filename: string;
    originalName: string;
    thumbnailUrl?: string | null;
    mimeType: string;
    size: number;
    width?: number | null;
    height?: number | null;
    duration?: number | null;
  }[];
};

export function SignalCard({
  signal,
  variant = "default",
  onSave,
  onReact,
}: {
  signal: CardSignal;
  variant?: "default" | "compact" | "featured";
  showFrequency?: boolean;
  onSave?: (id: string, saved: boolean) => void;
  onReact?: (id: string, type: string, active: boolean) => void;
  onShare?: (id: string) => void;
  onReport?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  const mediaPlayer = usePlayer();
  const [saved, setSaved] = React.useState(Boolean(signal.isSaved));
  const [reacted, setReacted] = React.useState(Boolean(signal.isReacted));
  const [reactionCount, setReactionCount] = React.useState(signal.reactionCount || 0);
  const [saveCount, setSaveCount] = React.useState(signal.saveCount || 0);
  const [actionBusy, setActionBusy] = React.useState<"react" | "save" | null>(null);
  const [copied, setCopied] = React.useState(false);
  const newestFiles = [...(signal.files || [])].reverse();
  const imageFile = newestFiles.find((file) =>
    file.mimeType.startsWith("image/"),
  );
  const audioFile = newestFiles.find((file) =>
    file.mimeType.startsWith("audio/"),
  );
  const documentFile = newestFiles.find(
    (file) =>
      !file.mimeType.startsWith("image/") &&
      !file.mimeType.startsWith("audio/"),
  );
  const image =
    signal.previewImageUrl || imageFile?.thumbnailUrl || imageFile?.url;

  async function copyCode() {
    await navigator.clipboard.writeText(signal.content || "");
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  async function toggleReaction() {
    if (actionBusy) return;
    setActionBusy("react");
    try {
      const response = await fetch(`/api/signals/${signal.id}/reactions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "STAR" }) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "Reaction could not be updated");
      setReactionCount((count) => Math.max(0, count + (result.active ? 1 : -1)));
      setReacted(Boolean(result.active));
      onReact?.(signal.id, "STAR", Boolean(result.active));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Reaction could not be updated");
    } finally {
      setActionBusy(null);
    }
  }

  async function toggleSave() {
    if (actionBusy) return;
    setActionBusy("save");
    try {
      const response = await fetch(`/api/signals/${signal.id}/save`, { method: "POST" });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "Signal could not be saved");
      setSaveCount((count) => Math.max(0, count + (result.saved ? 1 : -1)));
      setSaved(Boolean(result.saved));
      onSave?.(signal.id, Boolean(result.saved));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Signal could not be saved");
    } finally {
      setActionBusy(null);
    }
  }

  async function shareSignal() {
    const url = `${window.location.origin}/signals/${signal.id}`;
    try {
      if (navigator.share) await navigator.share({ title: signal.title || "Signal", url });
      else { await navigator.clipboard.writeText(url); toast.success("Signal link copied"); }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Signal could not be shared");
    }
  }

  return (
    <article
      className={cn(
        "signal-archive-card group relative mb-4 inline-block w-full overflow-hidden rounded-[11px] border border-white/[.075] bg-[#0d0e13] align-top shadow-[0_18px_50px_rgba(0,0,0,.12)] transition duration-300 hover:-translate-y-0.5 hover:border-white/[.13]",
        variant === "compact" && "flex",
      )}
    >
      <div className="absolute left-4 top-3 z-10 font-mono text-[9px] uppercase tracking-wide text-zinc-500">
        {signal.type === "AUDIO" ? "VOICE" : signal.type}
      </div>
      {(signal.type === "IMAGE" || signal.type === "SCREENSHOT") && (
        <Link
          href={`/signals/${signal.id}`}
          className={cn("block overflow-hidden bg-zinc-900", variant === "featured" ? "max-h-[80vh]" : "h-[158px]")}
        >
          <img
            src={image || ""}
            alt={signal.title || "Signal"}
            className={cn("w-full transition duration-500", variant === "featured" ? "h-auto max-h-[80vh] object-contain opacity-100" : "h-full object-cover opacity-75 grayscale-[.35] group-hover:scale-[1.025] group-hover:opacity-90")}
          />
        </Link>
      )}
      {signal.type === "LINK" && image && (
        <Link
          href={`/signals/${signal.id}`}
          className="block h-[158px] overflow-hidden"
        >
          <img
            src={image}
            alt=""
            className="h-full w-full object-cover opacity-70 grayscale-[.25] transition duration-500 group-hover:scale-[1.025]"
          />
        </Link>
      )}
      {signal.type === "CODE" && (
        <div className="relative h-[178px] overflow-hidden bg-[#0a0b10] px-5 pb-4 pt-12">
          <button
            onClick={copyCode}
            className="absolute right-3 top-3 z-10 rounded-md p-1.5 text-zinc-600 hover:bg-white/5 hover:text-zinc-300"
            aria-label="Copy code"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
          <pre className="overflow-hidden whitespace-pre-wrap break-words font-mono text-[9px] leading-[1.55] text-zinc-400">
            <code>{signal.content}</code>
          </pre>
          <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#0a0b10]" />
        </div>
      )}
      {signal.type === "NOTE" && (
        <Link
          href={`/signals/${signal.id}`}
          className="block min-h-[198px] px-5 pb-7 pt-16"
        >
          <p className="max-w-[18ch] font-mono text-[17px] leading-[1.35] text-zinc-200">
            {signal.title}
          </p>
        </Link>
      )}
      {(signal.type === "DOCUMENT" || signal.type === "FILE") && (
        <div className="flex min-h-[150px] items-center gap-4 px-6 pt-6">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[.03]">
            <FileText className="h-5 w-5 text-violet-300" />
          </span>
          <span className="min-w-0 flex-1">
            <Link
              href={`/signals/${signal.id}`}
              className="block truncate font-mono text-sm text-zinc-200"
            >
              {signal.title}
            </Link>
            <small className="mt-2 block truncate font-mono text-[10px] text-zinc-600">
              {documentFile?.originalName || "Saved document"}
            </small>
          </span>
          {documentFile && (
            <a
              href={`${documentFile.url}?download=1`}
              className="rounded-lg border border-white/[.08] p-2.5 text-zinc-500 hover:text-violet-300"
              aria-label={`Download ${documentFile.originalName}`}
            >
              <Download className="h-4 w-4" />
            </a>
          )}
        </div>
      )}
      {signal.type === "SONG" &&
      signal.mediaProvider &&
      signal.externalId &&
      signal.sourceUrl ? (
        <div className="pt-10">
          <div className="relative aspect-video overflow-hidden bg-zinc-950">
            {signal.thumbnailUrl ? (
              signal.mediaProvider === "audius" ? (
                <img
                  src={signal.thumbnailUrl}
                  alt={signal.title || "Media thumbnail"}
                  className="h-full w-full object-cover opacity-75 transition duration-500 group-hover:scale-[1.02] group-hover:opacity-90"
                />
              ) : (
                <Image
                  src={signal.thumbnailUrl}
                  alt={signal.title || "Media thumbnail"}
                  fill
                  sizes="(max-width: 640px) 100vw, 360px"
                  className="object-cover opacity-75 transition duration-500 group-hover:scale-[1.02] group-hover:opacity-90"
                />
              )
            ) : (
              <div className="h-full bg-[radial-gradient(circle_at_50%_40%,rgba(139,92,246,.18),transparent_55%)]" />
            )}
            <span className="absolute left-3 top-3 rounded-full border border-white/10 bg-black/60 px-2 py-1 font-mono text-[8px] uppercase text-zinc-300">
              {signal.mediaProvider} · {signal.mediaEntityType}
            </span>
            {signal.mediaProvider === "audius" ? (
              <AudiusPlayButton signal={signal} />
            ) : (
              <button
                onClick={() =>
                  mediaPlayer.play({
                    signalId: signal.id,
                    provider: signal.mediaProvider as "youtube" | "spotify",
                    entityType: signal.mediaEntityType || "media",
                    externalId: signal.externalId!,
                    canonicalUrl: signal.sourceUrl!,
                    providerUri: signal.providerUri || undefined,
                    title: signal.title || "Untitled media",
                    creator: signal.creatorName || undefined,
                    thumbnailUrl: signal.thumbnailUrl || undefined,
                  })
                }
                className="absolute inset-0 grid place-items-center"
                aria-label={`Play ${signal.title || "media"}`}
              >
                <span className="grid h-12 w-12 place-items-center rounded-full border border-white/30 bg-black/55 text-white backdrop-blur">
                  <Play className="ml-0.5 h-4 w-4 fill-current" />
                </span>
              </button>
            )}
          </div>
          <div className="px-5 pb-5 pt-4">
            <Link
              href={`/signals/${signal.id}`}
              className="line-clamp-2 font-mono text-[13px] text-zinc-200"
            >
              {signal.title}
            </Link>
            <p className="mt-2 truncate font-mono text-[10px] text-zinc-500">
              {signal.creatorName || signal.mediaProvider}
            </p>
            {signal.frequency && (
              <p className="mt-3 font-mono text-[9px] text-violet-300/70">
                {signal.frequency.name}
              </p>
            )}
          </div>
        </div>
      ) : (
        (signal.type === "SONG" || signal.type === "AUDIO") && (
          <div className="min-h-[190px] px-5 pb-5 pt-14">
            <Link
              href={`/signals/${signal.id}`}
              className="font-mono text-[14px] text-zinc-200"
            >
              {signal.title}
            </Link>
            <p className="mt-2 truncate font-mono text-[10px] text-zinc-500">
              {signal.artist || signal.description || audioFile?.originalName}
            </p>
            <AudioPlayer
              signalId={signal.id}
              title={signal.title || "Untitled audio"}
              artist={
                signal.artist || signal.description || audioFile?.originalName
              }
              src={audioFile?.url}
              fallbackDuration={signal.duration}
            />
          </div>
        )
      )}
      {![
        "IMAGE",
        "SCREENSHOT",
        "LINK",
        "CODE",
        "NOTE",
        "DOCUMENT",
        "FILE",
        "SONG",
        "AUDIO",
      ].includes(signal.type) && (
        <div className="min-h-[150px] px-5 pt-14">
          <p>{signal.title}</p>
        </div>
      )}

      {["IMAGE", "SCREENSHOT", "LINK"].includes(signal.type) && (
        <div
          className={cn(
            "px-5 pb-5",
            signal.type === "LINK" && !image ? "pt-12" : "pt-4",
          )}
        >
          <Link
            href={`/signals/${signal.id}`}
            className="font-mono text-[13px] text-zinc-200 hover:text-white"
          >
            {signal.title}
          </Link>
          {signal.description && (
            <p className="mt-2 line-clamp-1 font-mono text-[10px] text-zinc-500">
              {signal.description}
            </p>
          )}
          {signal.sourceDomain && (
            <p className="mt-2 font-mono text-[10px] text-zinc-500">
              {signal.sourceDomain}
            </p>
          )}
        </div>
      )}
      {signal.type === "CODE" && (
        <div className="px-5 pb-4 pt-3">
          <Link
            href={`/signals/${signal.id}`}
            className="font-mono text-[12px] text-zinc-200"
          >
            {signal.title}
          </Link>
        </div>
      )}
      <footer className="flex h-10 items-center border-t border-white/[.06] px-4 font-mono text-[10px] text-zinc-500">
        <Link
          href={`/profile/${signal.owner.username}`}
          className="hover:text-zinc-200"
        >
          {signal.owner.username}
        </Link>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => void toggleReaction()}
            disabled={Boolean(actionBusy)}
            className={cn(
              "flex items-center gap-1 rounded p-1.5 hover:bg-white/5",
              reacted && "text-amber-400",
            )}
            aria-label="React"
          >
            <Star className={cn("h-3.5 w-3.5", reacted && "fill-current")} />
            <span>
              {reactionCount}
            </span>
          </button>
          <Link
            href={`/signals/${signal.id}#comments`}
            className="flex items-center gap-1 rounded p-1.5 hover:bg-white/5"
            aria-label="Comments"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            <span>{signal.commentCount || 0}</span>
          </Link>
          <button
            onClick={() => void toggleSave()}
            disabled={Boolean(actionBusy)}
            className={cn(
              "flex items-center gap-1 rounded p-1.5 hover:bg-white/5",
              saved && "text-violet-300",
            )}
            aria-label="Save"
          >
            <Bookmark className={cn("h-3.5 w-3.5", saved && "fill-current")} />
            <span>
              {saveCount}
            </span>
          </button>
          <button onClick={() => void shareSignal()} className="rounded p-1.5 hover:bg-white/5" aria-label="Share">
            <Share2 className="h-3.5 w-3.5" />
          </button>
          {signal.sourceUrl ? (
            <a
              href={signal.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded p-1.5 hover:bg-white/5"
              aria-label="Open source"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : (
            <Link
              href={`/signals/${signal.id}`}
              className="rounded p-1.5 hover:bg-white/5"
              aria-label="More"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </footer>
    </article>
  );
}

function AudiusPlayButton({ signal }: { signal: CardSignal }) {
  const player = useAudioPlayer();
  const src = `https://api.audius.co/v1/tracks/${encodeURIComponent(signal.externalId || "")}/stream`;
  const active = player.current?.src === src;
  const playing = active && player.playing;

  return (
    <button
      onClick={() =>
        player
          .playTrack({
            id: `${signal.id}:audius:${signal.externalId}`,
            signalId: signal.id,
            title: signal.title || "Untitled Audius track",
            artist: signal.creatorName || "Audius",
            src,
          })
          .catch(() => undefined)
      }
      className="absolute inset-0 grid place-items-center"
      aria-label={`${playing ? "Pause" : "Play"} ${signal.title || "Audius track"}`}
    >
      <span className="grid h-12 w-12 place-items-center rounded-full border border-white/30 bg-black/55 text-white backdrop-blur">
        {playing ? (
          <Pause className="h-4 w-4 fill-current" />
        ) : (
          <Play className="ml-0.5 h-4 w-4 fill-current" />
        )}
      </span>
    </button>
  );
}

function AudioPlayer({
  signalId,
  title,
  artist,
  src,
  fallbackDuration,
}: {
  signalId: string;
  title: string;
  artist?: string;
  src?: string;
  fallbackDuration?: string;
}) {
  const player = useAudioPlayer();
  const active = Boolean(src && player.current?.src === src);
  const playing = active && player.playing;
  const progress = active ? player.progress : 0;
  const duration = active ? player.duration : 0;

  return (
    <div className="mt-7 flex items-center gap-3">
      {src ? (
        <button
          onClick={() =>
            player
              .playTrack({
                id: `${signalId}:${src}`,
                signalId,
                title,
                artist,
                src,
              })
              .catch(() => undefined)
          }
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-violet-300/70 text-zinc-200"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? (
            <Pause className="h-3.5 w-3.5 fill-current" />
          ) : (
            <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
          )}
        </button>
      ) : (
        <button
          disabled
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-zinc-700 text-zinc-700"
          aria-label="No audio file"
        >
          <Play className="h-3.5 w-3.5" />
        </button>
      )}
      <Wave progress={progress} />
      <span className="font-mono text-[9px] text-zinc-500">
        {duration ? formatDuration(duration) : fallbackDuration || "--:--"}
      </span>
    </div>
  );
}

function Wave({ progress }: { progress: number }) {
  const heights = [
    3, 5, 8, 12, 16, 20, 13, 8, 14, 18, 11, 7, 15, 19, 13, 9, 6, 11, 14, 8, 5,
    9, 12, 7, 4, 8, 10, 6,
  ];
  return (
    <span className="flex h-8 flex-1 items-center gap-[2px] overflow-hidden">
      {heights.map((height, index) => (
        <i
          key={index}
          className={cn(
            "w-[2px] shrink-0 rounded-full bg-zinc-700",
            index / heights.length <= progress && "bg-violet-400",
          )}
          style={{ height: `${height}px` }}
        />
      ))}
    </span>
  );
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}
