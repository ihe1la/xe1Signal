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
  Heart,
  MessageCircle,
  MoreHorizontal,
  Pause,
  Play,
  Share2,
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

function typeLabel(type: string) {
  return type === "AUDIO" ? "VOICE" : type;
}

function formatBytes(size?: number | null) {
  if (!size) return null;
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  if (size >= 1024) return `${Math.round(size / 1024)} KB`;
  return `${size} B`;
}

function formatMs(ms?: number | null, fallback?: string) {
  if (!ms && fallback) return fallback;
  if (!ms) return "--:--";
  const total = Math.round(ms / 1000);
  const minutes = Math.floor(total / 60);
  return `${String(minutes).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

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
  const imageFile = newestFiles.find((file) => file.mimeType.startsWith("image/"));
  const audioFile = newestFiles.find((file) => file.mimeType.startsWith("audio/"));
  const documentFile = newestFiles.find(
    (file) => !file.mimeType.startsWith("image/") && !file.mimeType.startsWith("audio/"),
  );
  const image = signal.previewImageUrl || imageFile?.thumbnailUrl || imageFile?.url;
  const ownerName = signal.owner.name || signal.owner.username;
  const hasStreamingSong = Boolean(
    signal.type === "SONG" && signal.mediaProvider && signal.externalId && signal.sourceUrl,
  );

  async function copyCode() {
    await navigator.clipboard.writeText(signal.content || "");
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  async function toggleReaction() {
    if (actionBusy) return;
    setActionBusy("react");
    try {
      const response = await fetch(`/api/signals/${signal.id}/reactions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "STAR" }),
      });
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
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Signal link copied");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Signal could not be shared");
    }
  }

  return (
    <article
      className={cn(
        "signal-archive-card group relative mb-4 inline-block w-full overflow-hidden rounded-[12px] border border-white/[.07] bg-[#0d0e13] align-top transition duration-200 hover:border-white/[.12]",
        variant === "compact" && "flex",
      )}
    >
      <div className="absolute left-3.5 top-3 z-10 font-mono text-[9px] uppercase tracking-[.16em] text-violet-400">
        {typeLabel(signal.type)}
      </div>

      {(signal.type === "IMAGE" || signal.type === "SCREENSHOT") && (
        <>
          <Link
            href={`/signals/${signal.id}`}
            className={cn(
              "block overflow-hidden bg-zinc-900",
              variant === "featured" ? "max-h-[80vh]" : signal.type === "SCREENSHOT" ? "h-[132px]" : "h-[168px]",
            )}
          >
            <img
              src={image || ""}
              alt={signal.title || "Signal"}
              className={cn(
                "w-full transition duration-500",
                variant === "featured"
                  ? "h-auto max-h-[80vh] object-contain opacity-100"
                  : "h-full object-cover opacity-90 group-hover:scale-[1.02]",
              )}
            />
          </Link>
          <div className="px-4 pb-3 pt-3">
            <Link href={`/signals/${signal.id}`} className="font-mono text-[13px] text-zinc-100">
              {signal.title}
            </Link>
            <p className="mt-1 font-mono text-[10px] text-zinc-500">{ownerName}</p>
          </div>
        </>
      )}

      {signal.type === "LINK" && (
        <div className="relative px-4 pb-3 pt-10">
          {signal.sourceUrl && (
            <a
              href={signal.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="absolute right-3 top-3 rounded-md p-1.5 text-zinc-600 hover:bg-white/5 hover:text-zinc-300"
              aria-label="Open source"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          <div className="mb-3 flex items-center gap-2 font-mono text-[10px] text-zinc-500">
            <span className="grid h-5 w-5 place-items-center rounded bg-white/[.04] text-[9px] uppercase text-violet-300">
              {(signal.sourceDomain || "link").slice(0, 1)}
            </span>
            <span className="truncate">{signal.sourceDomain || "link"}</span>
          </div>
          <Link href={`/signals/${signal.id}`} className="block font-mono text-[13px] leading-5 text-zinc-100">
            {signal.title}
          </Link>
          {signal.description && (
            <p className="mt-2 line-clamp-2 font-mono text-[10px] leading-5 text-zinc-500">
              {signal.description}
            </p>
          )}
        </div>
      )}

      {signal.type === "CODE" && (
        <>
          <div className="relative overflow-hidden bg-[#090a0f] px-4 pb-3 pt-10">
            <button
              onClick={copyCode}
              className="absolute right-2.5 top-2.5 z-10 rounded-md p-1.5 text-zinc-600 hover:bg-white/5 hover:text-zinc-300"
              aria-label="Copy code"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            <pre className="max-h-[148px] overflow-hidden whitespace-pre-wrap break-words font-mono text-[10px] leading-[1.55] text-violet-200/80">
              <code>{signal.content}</code>
            </pre>
          </div>
          <div className="px-4 pb-3 pt-3">
            <Link href={`/signals/${signal.id}`} className="font-mono text-[12px] text-zinc-100">
              {signal.title}
            </Link>
            <p className="mt-1 font-mono text-[10px] text-zinc-500">{ownerName}</p>
          </div>
        </>
      )}

      {signal.type === "NOTE" && (
        <Link href={`/signals/${signal.id}`} className="block px-4 pb-4 pt-10">
          <p className="font-mono text-[14px] leading-[1.35] text-zinc-100">{signal.title}</p>
          {signal.content && (
            <div className="mt-3 space-y-1.5 font-mono text-[11px] leading-5 text-zinc-500">
              {signal.content
                .split("\n")
                .filter(Boolean)
                .slice(0, 4)
                .map((line) => (
                  <p key={line}>{line}</p>
                ))}
            </div>
          )}
        </Link>
      )}

      {(signal.type === "DOCUMENT" || signal.type === "FILE") && (
        <div className="relative px-4 pb-4 pt-10">
          {documentFile?.url && documentFile.url !== "#" ? (
            <a
              href={`${documentFile.url}?download=1`}
              className="absolute right-3 top-3 rounded-md p-1.5 text-zinc-600 hover:bg-white/5 hover:text-zinc-300"
              aria-label={`Download ${documentFile.originalName}`}
            >
              <Download className="h-3.5 w-3.5" />
            </a>
          ) : signal.sourceUrl ? (
            <a
              href={signal.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="absolute right-3 top-3 rounded-md p-1.5 text-zinc-600 hover:bg-white/5 hover:text-zinc-300"
              aria-label="Open document"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : null}
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-rose-500/15 font-mono text-[10px] font-medium text-rose-300">
              PDF
            </span>
            <span className="min-w-0 pt-0.5">
              <Link href={`/signals/${signal.id}`} className="block font-mono text-[13px] text-zinc-100">
                {signal.title}
              </Link>
              <small className="mt-1.5 block font-mono text-[10px] text-zinc-500">
                {formatBytes(documentFile?.size) || signal.description || "Document"}
              </small>
            </span>
          </div>
        </div>
      )}

      {hasStreamingSong ? (
        <div className="pt-9">
          <div className="relative aspect-video overflow-hidden bg-zinc-950">
            {signal.thumbnailUrl ? (
              signal.mediaProvider === "audius" ? (
                <img
                  src={signal.thumbnailUrl}
                  alt={signal.title || "Media thumbnail"}
                  className="h-full w-full object-cover opacity-85 transition duration-500 group-hover:scale-[1.02]"
                />
              ) : (
                <Image
                  src={signal.thumbnailUrl}
                  alt={signal.title || "Media thumbnail"}
                  fill
                  sizes="(max-width: 640px) 100vw, 360px"
                  className="object-cover opacity-85 transition duration-500 group-hover:scale-[1.02]"
                />
              )
            ) : (
              <div className="h-full bg-[radial-gradient(circle_at_50%_40%,rgba(139,92,246,.14),transparent_55%)]" />
            )}
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
                <span className="grid h-10 w-10 place-items-center rounded-full border border-white/25 bg-black/55 text-white backdrop-blur">
                  <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
                </span>
              </button>
            )}
          </div>
          <div className="px-4 pb-3 pt-3">
            <Link href={`/signals/${signal.id}`} className="line-clamp-2 font-mono text-[13px] text-zinc-100">
              {signal.title}
            </Link>
            <p className="mt-1 truncate font-mono text-[10px] text-zinc-500">
              {signal.creatorName || signal.mediaProvider}
            </p>
          </div>
        </div>
      ) : (
        (signal.type === "SONG" || signal.type === "AUDIO") && (
          <div className="px-4 pb-4 pt-10">
            {signal.type === "SONG" && (
              <div className="mb-4 flex items-center gap-3">
                {(signal.thumbnailUrl || signal.previewImageUrl) && (
                  <img
                    src={signal.thumbnailUrl || signal.previewImageUrl || ""}
                    alt=""
                    className="h-12 w-12 rounded-md object-cover"
                  />
                )}
                <div className="min-w-0">
                  <Link href={`/signals/${signal.id}`} className="block truncate font-mono text-[13px] text-zinc-100">
                    {signal.title}
                  </Link>
                  <p className="mt-1 truncate font-mono text-[10px] text-zinc-500">
                    {signal.artist || signal.creatorName || signal.description || ownerName}
                  </p>
                </div>
              </div>
            )}
            {signal.type === "AUDIO" && (
              <Link href={`/signals/${signal.id}`} className="mb-4 block font-mono text-[13px] text-zinc-100">
                {signal.title}
              </Link>
            )}
            <AudioPlayer
              signalId={signal.id}
              title={signal.title || "Untitled audio"}
              artist={signal.artist || signal.creatorName || signal.description || undefined}
              src={audioFile?.url}
              fallbackDuration={formatMs(signal.durationMs, signal.duration)}
            />
          </div>
        )
      )}

      {!["IMAGE", "SCREENSHOT", "LINK", "CODE", "NOTE", "DOCUMENT", "FILE", "SONG", "AUDIO"].includes(
        signal.type,
      ) && (
        <div className="px-4 pb-4 pt-10">
          <p className="font-mono text-[13px] text-zinc-100">{signal.title}</p>
        </div>
      )}

      <footer className="flex h-10 items-center border-t border-white/[.055] px-3 font-mono text-[9px] text-zinc-500">
        <div className="ml-auto flex items-center gap-0.5">
          <button
            onClick={() => void toggleReaction()}
            disabled={Boolean(actionBusy)}
            className={cn(
              "flex items-center gap-1 rounded p-1.5 hover:bg-white/5 hover:text-zinc-300",
              reacted && "text-rose-400",
            )}
            aria-label={reacted ? "Unlike" : "Like"}
          >
            <Heart className={cn("h-3.5 w-3.5", reacted && "fill-current")} />
            <span>{reactionCount}</span>
          </button>
          <Link
            href={`/signals/${signal.id}#comments`}
            className="flex items-center gap-1 rounded p-1.5 hover:bg-white/5 hover:text-zinc-300"
            aria-label="Comments"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            <span>{signal.commentCount || 0}</span>
          </Link>
          <button
            onClick={() => void toggleSave()}
            disabled={Boolean(actionBusy)}
            className={cn(
              "flex items-center gap-1 rounded p-1.5 hover:bg-white/5 hover:text-zinc-300",
              saved && "text-violet-300",
            )}
            aria-label="Save"
          >
            <Bookmark className={cn("h-3.5 w-3.5", saved && "fill-current")} />
            {saveCount > 0 ? <span>{saveCount}</span> : null}
          </button>
          <button
            onClick={() => void shareSignal()}
            className="rounded p-1.5 hover:bg-white/5 hover:text-zinc-300"
            aria-label="Share"
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>
          <Link
            href={`/signals/${signal.id}`}
            className="rounded p-1.5 hover:bg-white/5 hover:text-zinc-300"
            aria-label="More"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Link>
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
      <span className="grid h-10 w-10 place-items-center rounded-full border border-white/25 bg-black/55 text-white backdrop-blur">
        {playing ? <Pause className="h-3.5 w-3.5 fill-current" /> : <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />}
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
  const progress = active ? player.progress : 0.35;
  const duration = active ? player.duration : 0;

  return (
    <div className="flex items-center gap-3">
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
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-violet-300/70 text-zinc-100"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause className="h-3 w-3 fill-current" /> : <Play className="ml-0.5 h-3 w-3 fill-current" />}
        </button>
      ) : (
        <button
          type="button"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-violet-300/70 text-zinc-100"
          aria-label="Preview waveform"
        >
          <Play className="ml-0.5 h-3 w-3 fill-current" />
        </button>
      )}
      <Wave progress={progress} />
      <span className="font-mono text-[9px] tabular-nums text-zinc-500">
        {duration ? formatDuration(duration) : fallbackDuration || "--:--"}
      </span>
    </div>
  );
}

function Wave({ progress }: { progress: number }) {
  const heights = [4, 8, 14, 20, 12, 18, 9, 16, 22, 11, 17, 8, 15, 21, 10, 14, 7, 13, 19, 12, 6, 11, 16, 9, 5, 10, 14, 8];
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
  return `${String(minutes).padStart(2, "0")}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}
