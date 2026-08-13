"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bookmark,
  Check,
  Copy,
  ExternalLink,
  FileText,
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
  files?: SignalFile[];
};

type SignalFile = {
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
  const imageFile = newestFiles.find((file) => file.mimeType.startsWith("image/"));
  const audioFile = newestFiles.find((file) => file.mimeType.startsWith("audio/"));
  const documentFile = newestFiles.find(
    (file) => !file.mimeType.startsWith("image/") && !file.mimeType.startsWith("audio/"),
  );
  const image =
    signal.previewImageUrl ||
    signal.thumbnailUrl ||
    imageFile?.thumbnailUrl ||
    imageFile?.url;
  const typeLabel = signal.type === "AUDIO" ? "VOICE" : signal.type;
  const ownerName = signal.owner.name || signal.owner.username;
  const showExternal = Boolean(signal.sourceUrl) && ["LINK", "DOCUMENT", "FILE"].includes(signal.type);

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

  function playEmbeddedMedia() {
    if (!signal.mediaProvider || !signal.externalId || !signal.sourceUrl) return;
    if (signal.mediaProvider === "audius") return;
    mediaPlayer.play({
      signalId: signal.id,
      provider: signal.mediaProvider,
      entityType: signal.mediaEntityType || "media",
      externalId: signal.externalId,
      canonicalUrl: signal.sourceUrl,
      providerUri: signal.providerUri || undefined,
      title: signal.title || "Untitled media",
      creator: signal.creatorName || undefined,
      thumbnailUrl: signal.thumbnailUrl || image || undefined,
    });
  }

  if (variant === "compact") {
    return (
      <article className="flex items-center gap-4 rounded-xl border border-white/[.08] bg-[#141418] px-4 py-3">
        <span className="w-20 shrink-0 text-[10px] font-medium uppercase tracking-[.14em] text-violet-400">
          {typeLabel}
        </span>
        <Link href={`/signals/${signal.id}`} className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-100">{signal.title || "Untitled signal"}</p>
          <p className="mt-0.5 truncate text-xs text-zinc-500">{ownerName}</p>
        </Link>
        <CardActions
          signal={signal}
          reacted={reacted}
          reactionCount={reactionCount}
          saved={saved}
          saveCount={saveCount}
          actionBusy={actionBusy}
          spread={false}
          onReact={() => void toggleReaction()}
          onSave={() => void toggleSave()}
          onShare={() => void shareSignal()}
        />
      </article>
    );
  }

  return (
    <article
      className={cn(
        "signal-archive-card group relative flex h-full w-full flex-col overflow-hidden rounded-[14px] border border-white/[.08] bg-[#141418] shadow-[0_18px_40px_rgba(0,0,0,.22)] transition duration-300 hover:-translate-y-0.5 hover:border-white/[.14]",
      )}
    >
      <header className="flex items-center justify-between px-5 pt-4">
        <span className="text-[10px] font-medium uppercase tracking-[.16em] text-violet-400">{typeLabel}</span>
        {showExternal && (
          <a
            href={signal.sourceUrl || undefined}
            target="_blank"
            rel="noreferrer"
            className="rounded-md p-1 text-zinc-500 transition hover:text-zinc-200"
            aria-label="Open source"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </header>

      <div className={cn("flex flex-1 flex-col px-5 pt-3", variant === "featured" && "pt-4")}>
        {(signal.type === "IMAGE" || signal.type === "SCREENSHOT") && (
          <VisualBlock href={`/signals/${signal.id}`} featured={variant === "featured"}>
            {image ? (
              <img
                src={image}
                alt={signal.title || "Signal"}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
              />
            ) : (
              <div className="h-full w-full bg-[radial-gradient(circle_at_30%_20%,rgba(139,92,246,.28),transparent_55%),#101014]" />
            )}
          </VisualBlock>
        )}

        {signal.type === "LINK" && <LinkBody signal={signal} />}

        {signal.type === "NOTE" && <NoteBody signal={signal} />}

        {signal.type === "CODE" && (
          <div className="relative overflow-hidden rounded-xl bg-[#0c0c10] ring-1 ring-white/[.06]">
            <button
              onClick={() => void copyCode()}
              className="absolute right-2 top-2 z-10 rounded-md p-1.5 text-zinc-600 hover:bg-white/5 hover:text-zinc-300"
              aria-label="Copy code"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            <pre className="max-h-[168px] overflow-hidden px-4 pb-4 pt-4 font-mono text-[11px] leading-[1.65]">
              <CodeHighlight code={signal.content || ""} />
            </pre>
          </div>
        )}

        {(signal.type === "DOCUMENT" || signal.type === "FILE") && (
          <DocumentBody signal={signal} file={documentFile} />
        )}

        {signal.type === "SONG" && (
          <SongBody
            signal={signal}
            image={image}
            audioFile={audioFile}
            onPlayEmbedded={playEmbeddedMedia}
          />
        )}

        {signal.type === "AUDIO" && (
          <VoiceBody signal={signal} audioFile={audioFile} />
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
          <Link href={`/signals/${signal.id}`} className="py-6 text-sm font-medium text-zinc-100">
            {signal.title || "Untitled signal"}
          </Link>
        )}

        {["IMAGE", "SCREENSHOT", "CODE"].includes(signal.type) && (
          <TitleMeta href={`/signals/${signal.id}`} title={signal.title} owner={ownerName} />
        )}
      </div>

      <footer className="mt-auto flex h-12 shrink-0 items-center border-t border-white/[.06] px-3">
        <CardActions
          signal={signal}
          reacted={reacted}
          reactionCount={reactionCount}
          saved={saved}
          saveCount={saveCount}
          actionBusy={actionBusy}
          onReact={() => void toggleReaction()}
          onSave={() => void toggleSave()}
          onShare={() => void shareSignal()}
        />
      </footer>
    </article>
  );
}

function TitleMeta({
  href,
  title,
  owner,
}: {
  href: string;
  title?: string | null;
  owner: string;
}) {
  return (
    <div className="mt-auto pt-4 pb-1">
      <Link href={href} className="line-clamp-2 text-[15px] font-semibold leading-snug text-zinc-50 hover:text-white">
        {title || "Untitled signal"}
      </Link>
      <p className="mt-1.5 text-[13px] text-zinc-500">{owner}</p>
    </div>
  );
}

function VisualBlock({
  href,
  featured,
  children,
}: {
  href: string;
  featured?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "block overflow-hidden rounded-xl bg-zinc-950",
        featured ? "max-h-[70vh]" : "h-[168px]",
      )}
    >
      <span className={cn("block overflow-hidden", featured ? "h-auto" : "h-full")}>{children}</span>
    </Link>
  );
}

function LinkBody({ signal }: { signal: CardSignal }) {
  const domain = signal.sourceDomain || domainFromUrl(signal.sourceUrl);
  return (
    <Link href={`/signals/${signal.id}`} className="flex min-h-[148px] flex-col pb-2">
      <span className="flex items-center gap-2 text-[12px] text-zinc-500">
        {domain ? (
          <img
            src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`}
            alt=""
            className="h-4 w-4 rounded-[3px]"
          />
        ) : null}
        <span className="truncate">{domain || "Link"}</span>
      </span>
      <span className="mt-3 line-clamp-2 text-[16px] font-semibold leading-snug text-zinc-50">
        {signal.title || "Untitled link"}
      </span>
      {(signal.description || signal.content) && (
        <span className="mt-2 line-clamp-3 text-[13px] leading-5 text-zinc-500">
          {signal.description || signal.content}
        </span>
      )}
    </Link>
  );
}

function NoteBody({ signal }: { signal: CardSignal }) {
  const items = noteItems(signal.content, signal.description);
  return (
    <Link href={`/signals/${signal.id}`} className="block min-h-[148px] pb-1">
      <p className="text-[16px] font-semibold leading-snug text-zinc-50">
        {signal.title || "Untitled note"}
      </p>
      {items.length > 0 && (
        items.length === 1 ? (
          <p className="mt-3 line-clamp-5 text-[13px] leading-6 text-zinc-400">{items[0]}</p>
        ) : (
          <ul className="mt-3 space-y-1.5 text-[13px] leading-6 text-zinc-400">
            {items.slice(0, 4).map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-zinc-500" />
                <span className="line-clamp-2">{item}</span>
              </li>
            ))}
          </ul>
        )
      )}
    </Link>
  );
}

function DocumentBody({
  signal,
  file,
}: {
  signal: CardSignal;
  file?: SignalFile;
}) {
  const ext = fileExtension(file?.originalName || signal.title || "PDF");
  return (
    <Link href={`/signals/${signal.id}`} className="flex min-h-[132px] items-center gap-4 pb-3">
      <span
        className={cn(
          "grid h-12 w-12 shrink-0 place-items-center rounded-xl text-[11px] font-bold tracking-wide text-white",
          ext === "PDF" ? "bg-[#e11d48]" : "bg-violet-600",
        )}
      >
        {ext === "PDF" ? "PDF" : <FileText className="h-5 w-5" />}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[15px] font-semibold text-zinc-50">
          {signal.title || file?.originalName || "Saved document"}
        </span>
        <span className="mt-1 block text-[13px] text-zinc-500">
          {file ? formatBytes(file.size) : "Document"}
        </span>
      </span>
    </Link>
  );
}

function SongBody({
  signal,
  image,
  audioFile,
  onPlayEmbedded,
}: {
  signal: CardSignal;
  image?: string | null;
  audioFile?: SignalFile;
  onPlayEmbedded: () => void;
}) {
  const duration =
    formatDurationMs(signal.durationMs) ||
    (audioFile?.duration ? formatDuration(audioFile.duration) : null) ||
    signal.duration ||
    "--:--";
  const artist = signal.artist || signal.creatorName || signal.description || audioFile?.originalName || "Unknown artist";
  const hasLocalAudio = Boolean(audioFile?.url);
  const hasAudius = signal.mediaProvider === "audius" && Boolean(signal.externalId);
  const hasEmbedded = Boolean(signal.mediaProvider && signal.externalId && signal.sourceUrl && !hasAudius);

  return (
    <div className="pb-2">
      <div className="flex items-center gap-3">
        <span className="relative h-[52px] w-[52px] shrink-0 overflow-hidden rounded-lg bg-[#1b1b22] ring-1 ring-white/10">
          {image ? (
            <img src={image} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(139,92,246,.45),transparent_60%),#16161c]" />
          )}
        </span>
        <Link href={`/signals/${signal.id}`} className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold text-zinc-50">{signal.title || "Untitled song"}</span>
          <span className="mt-0.5 block truncate text-[13px] text-zinc-500">{artist}</span>
        </Link>
        {hasAudius ? (
          <AudiusPlayButton signal={signal} compact />
        ) : hasLocalAudio ? (
          <LocalPlayButton
            signalId={signal.id}
            title={signal.title || "Untitled audio"}
            artist={typeof artist === "string" ? artist : undefined}
            src={audioFile?.url}
          />
        ) : hasEmbedded ? (
          <button
            onClick={onPlayEmbedded}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-violet-400/40 bg-violet-500/10 text-violet-200"
            aria-label={`Play ${signal.title || "media"}`}
          >
            <Play className="ml-0.5 h-4 w-4 fill-current" />
          </button>
        ) : (
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-zinc-700 text-zinc-600">
            <Play className="ml-0.5 h-4 w-4 fill-current" />
          </span>
        )}
      </div>
      <div className="mt-4 flex items-center gap-3">
        {hasLocalAudio ? (
          <SyncedWave src={audioFile?.url} />
        ) : hasAudius ? (
          <SyncedWave src={`https://api.audius.co/v1/tracks/${encodeURIComponent(signal.externalId || "")}/stream`} />
        ) : (
          <Wave progress={0.42} />
        )}
        <span className="shrink-0 font-mono text-[11px] text-zinc-500">{duration}</span>
      </div>
    </div>
  );
}

function VoiceBody({
  signal,
  audioFile,
}: {
  signal: CardSignal;
  audioFile?: SignalFile;
}) {
  const duration =
    formatDurationMs(signal.durationMs) ||
    (audioFile?.duration ? formatDuration(audioFile.duration) : null) ||
    signal.duration ||
    "--:--";

  return (
    <div className="pb-2">
      <div className="flex items-center gap-3">
        <LocalPlayButton
          signalId={signal.id}
          title={signal.title || "Untitled audio"}
          artist={signal.description || audioFile?.originalName}
          src={audioFile?.url}
          large
        />
        <SyncedWave src={audioFile?.url} />
        <span className="shrink-0 font-mono text-[11px] text-zinc-500">{duration}</span>
      </div>
      <Link href={`/signals/${signal.id}`} className="mt-4 block">
        <span className="block truncate text-[15px] font-semibold text-zinc-50">{signal.title || "Voice note"}</span>
        <span className="mt-1 block text-[13px] text-zinc-500">{signal.owner.name || signal.owner.username}</span>
      </Link>
    </div>
  );
}

function CardActions({
  signal,
  reacted,
  reactionCount,
  saved,
  saveCount,
  actionBusy,
  onReact,
  onSave,
  onShare,
}: {
  signal: CardSignal;
  reacted: boolean;
  reactionCount: number;
  saved: boolean;
  saveCount: number;
  actionBusy: "react" | "save" | null;
  spread?: boolean;
  onReact: () => void;
  onSave: () => void;
  onShare: () => void;
}) {
  return (
    <div className="flex w-full items-center gap-0.5 text-zinc-500">
      <button
        onClick={onReact}
        disabled={Boolean(actionBusy)}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] hover:bg-white/5 hover:text-zinc-200",
          reacted && "text-rose-400",
        )}
        aria-label={reacted ? "Unlike" : "Like"}
      >
        <Heart className={cn("h-4 w-4", reacted && "fill-current")} />
        <span>{reactionCount}</span>
      </button>
      <Link
        href={`/signals/${signal.id}#comments`}
        className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] hover:bg-white/5 hover:text-zinc-200"
        aria-label="Comments"
      >
        <MessageCircle className="h-4 w-4" />
        <span>{signal.commentCount || 0}</span>
      </Link>
      <button
        onClick={onSave}
        disabled={Boolean(actionBusy)}
        className={cn(
          spread !== false && "ml-auto",
          "rounded-md p-1.5 hover:bg-white/5 hover:text-zinc-200",
          saved && "text-violet-300",
        )}
        aria-label="Save"
      >
        <Bookmark className={cn("h-4 w-4", saved && "fill-current")} />
        <span className="sr-only">{saveCount}</span>
      </button>
      <button onClick={onShare} className="rounded-md p-1.5 hover:bg-white/5 hover:text-zinc-200" aria-label="Share">
        <Share2 className="h-4 w-4" />
      </button>
      <Link href={`/signals/${signal.id}`} className="rounded-md p-1.5 hover:bg-white/5 hover:text-zinc-200" aria-label="More">
        <MoreHorizontal className="h-4 w-4" />
      </Link>
    </div>
  );
}

function AudiusPlayButton({ signal, compact = false }: { signal: CardSignal; compact?: boolean }) {
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
      className={cn(
        "grid place-items-center rounded-full border border-violet-400/40 bg-violet-500/10 text-violet-200",
        compact ? "h-10 w-10 shrink-0" : "absolute inset-0",
      )}
      aria-label={`${playing ? "Pause" : "Play"} ${signal.title || "Audius track"}`}
    >
      {playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="ml-0.5 h-4 w-4 fill-current" />}
    </button>
  );
}

function LocalPlayButton({
  signalId,
  title,
  artist,
  src,
  large = false,
}: {
  signalId: string;
  title: string;
  artist?: string;
  src?: string;
  large?: boolean;
}) {
  const player = useAudioPlayer();
  const active = Boolean(src && player.current?.src === src);
  const playing = active && player.playing;

  if (!src) {
    return (
      <button
        disabled
        className={cn(
          "grid shrink-0 place-items-center rounded-full border border-zinc-700 text-zinc-600",
          large ? "h-11 w-11" : "h-10 w-10",
        )}
        aria-label="No audio file"
      >
        <Play className={cn("fill-current", large ? "h-4 w-4" : "ml-0.5 h-4 w-4")} />
      </button>
    );
  }

  return (
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
      className={cn(
        "grid shrink-0 place-items-center rounded-full border border-violet-400/50 bg-violet-500/10 text-violet-100",
        large ? "h-11 w-11" : "h-10 w-10",
      )}
      aria-label={playing ? "Pause" : "Play"}
    >
      {playing ? (
        <Pause className="h-4 w-4 fill-current" />
      ) : (
        <Play className="ml-0.5 h-4 w-4 fill-current" />
      )}
    </button>
  );
}

function SyncedWave({ src }: { src?: string }) {
  const player = useAudioPlayer();
  const active = Boolean(src && player.current?.src === src);
  return <Wave progress={active ? player.progress : 0.35} />;
}

function Wave({ progress }: { progress: number }) {
  const heights = [8, 14, 22, 18, 28, 16, 24, 12, 20, 30, 18, 10, 26, 14, 22, 32, 18, 12, 24, 16, 28, 12, 20, 26, 14, 22, 10, 18, 30, 16, 12, 24];
  return (
    <span className="flex h-8 flex-1 items-center gap-[2px] overflow-hidden">
      {heights.map((height, index) => (
        <i
          key={index}
          className={cn(
            "w-[2.5px] shrink-0 rounded-full bg-violet-500/25",
            index / heights.length <= progress && "bg-violet-400",
          )}
          style={{ height: `${height}px` }}
        />
      ))}
    </span>
  );
}

function CodeHighlight({ code }: { code: string }) {
  const lines = code.split("\n").slice(0, 8);
  return (
    <code>
      {lines.map((line, index) => (
        <span key={index} className="block whitespace-pre-wrap break-words">
          {tokenize(line).map((token, tokenIndex) => (
            <span key={tokenIndex} className={tokenClass(token.type)}>
              {token.value}
            </span>
          ))}
          {index === lines.length - 1 ? null : "\n"}
        </span>
      ))}
    </code>
  );
}

function tokenize(line: string) {
  const pattern =
    /(\/\/.*$|'[^']*'|"[^"]*"|`[^`]*`|\b(?:const|let|var|function|async|await|return|if|else|throw|new|import|from|export|class|typeof|true|false|null|undefined)\b|\b\d+\b)/g;
  const tokens: { type: "keyword" | "string" | "number" | "comment" | "plain"; value: string }[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(line))) {
    if (match.index > last) tokens.push({ type: "plain", value: line.slice(last, match.index) });
    const value = match[0];
    const type = value.startsWith("//")
      ? "comment"
      : /^['"`]/.test(value)
        ? "string"
        : /^\d/.test(value)
          ? "number"
          : "keyword";
    tokens.push({ type, value });
    last = match.index + value.length;
  }
  if (last < line.length) tokens.push({ type: "plain", value: line.slice(last) });
  return tokens;
}

function tokenClass(type: "keyword" | "string" | "number" | "comment" | "plain") {
  if (type === "keyword") return "text-violet-300";
  if (type === "string") return "text-fuchsia-300";
  if (type === "number") return "text-amber-200";
  if (type === "comment") return "text-zinc-600";
  return "text-zinc-300";
}

function noteItems(content?: string | null, description?: string | null) {
  const text = [content, description].filter(Boolean).join("\n");
  return text
    .split(/\n+/)
    .map((line) => line.replace(/^[-*•]\s+/, "").trim())
    .filter(Boolean);
}

function domainFromUrl(url?: string | null) {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function fileExtension(name: string) {
  const ext = name.split(".").pop()?.toUpperCase();
  return ext && ext.length <= 4 ? ext : "FILE";
}

function formatBytes(size: number) {
  return size < 1024 * 1024
    ? `${Math.max(1, Math.round(size / 1024))} KB`
    : `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

function formatDurationMs(ms?: number | null) {
  if (!ms) return null;
  return formatDuration(ms / 1000);
}
