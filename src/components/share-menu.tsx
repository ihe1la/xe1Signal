"use client";

import * as React from "react";
import { Check, Clipboard, ExternalLink, Loader2, Send, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";

type ShareMenuProps = {
  title: string;
  sourceUrl?: string | null;
  signalUrl: string;
  className?: string;
  onClose?: () => void;
};

export function ShareMenu({ title, sourceUrl, signalUrl, className, onClose }: ShareMenuProps) {
  const recipientId = React.useId();
  const [recipient, setRecipient] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [copied, setCopied] = React.useState<"source" | "signal" | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);

  const absoluteSignalUrl = React.useMemo(() => {
    if (typeof window === "undefined") return signalUrl;
    try {
      return new URL(signalUrl, window.location.origin).href;
    } catch {
      return signalUrl;
    }
  }, [signalUrl]);
  const source = sourceUrl?.trim() || "";
  const sourceLabel = source ? sourceName(source) : "source";

  async function copy(value: string, kind: "source" | "signal") {
    const didCopy = await copyTextToClipboard(value);
    setCopied(didCopy ? kind : null);
    setStatus(didCopy ? "Link copied" : "Copy failed");
    window.setTimeout(() => {
      setCopied((current) => (current === kind ? null : current));
      setStatus((current) => (current === (didCopy ? "Link copied" : "Copy failed") ? null : current));
    }, 1600);
  }

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const username = recipient.trim().replace(/^@+/, "");
    if (!username || busy) return;
    setBusy(true);
    setStatus(null);
    try {
      const link = source || absoluteSignalUrl;
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username,
          content: `🎧 ${title}\n${link}`,
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "Message could not be sent");
      setRecipient("");
      setStatus(`Sent to @${username}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Message could not be sent");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-label={`Share ${title}`}
      onClick={(event) => event.stopPropagation()}
      className={cn("rounded-xl border border-white/[.1] bg-[#111218] p-3 shadow-2xl", className)}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate font-mono text-[10px] text-zinc-200">Share “{title}”</p>
        {onClose ? (
          <button type="button" onClick={onClose} className="rounded p-1 text-zinc-600 hover:text-zinc-200" aria-label="Close share menu">
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      <div className="mt-3 grid gap-2">
        <button
          type="button"
          onClick={() => void copy(source || absoluteSignalUrl, "source")}
          className="flex h-9 items-center gap-2 rounded-lg border border-white/[.08] px-3 text-left font-mono text-[10px] text-zinc-300 hover:border-violet-400/30 hover:text-violet-200"
        >
          {copied === "source" ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Clipboard className="h-3.5 w-3.5" />}
          Copy {source ? `${sourceLabel} link` : "link"}
        </button>
        {source ? (
          <button
            type="button"
            onClick={() => void copy(absoluteSignalUrl, "signal")}
            className="flex h-9 items-center gap-2 rounded-lg border border-white/[.08] px-3 text-left font-mono text-[10px] text-zinc-500 hover:border-violet-400/30 hover:text-zinc-200"
          >
            {copied === "signal" ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <ExternalLink className="h-3.5 w-3.5" />}
            Copy xe1Signal link
          </button>
        ) : null}
      </div>

      <form onSubmit={send} className="mt-3 border-t border-white/[.06] pt-3">
        <label htmlFor={recipientId} className="mb-1.5 block font-mono text-[9px] uppercase tracking-[.12em] text-zinc-600">
          Send to inbox
        </label>
        <div className="flex gap-2">
          <input
            id={recipientId}
            value={recipient}
            onChange={(event) => setRecipient(event.target.value)}
            placeholder="username"
            autoComplete="off"
            className="h-9 min-w-0 flex-1 rounded-lg border border-white/[.08] bg-[#0a0b10] px-2.5 font-mono text-[10px] text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-violet-400/30"
          />
          <button
            type="submit"
            disabled={busy || !recipient.trim()}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-violet-400/[.14] text-violet-200 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Send to inbox"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </button>
        </div>
      </form>
      {status ? <p className="mt-2 font-mono text-[9px] text-emerald-300/80" role="status">{status}</p> : null}
    </div>
  );
}

function sourceName(value: string) {
  try {
    const host = new URL(value).hostname.replace(/^www\./, "").toLowerCase();
    if (host.includes("spotify")) return "Spotify";
    if (host.includes("youtube")) return "YouTube";
    if (host.includes("audius")) return "Audius";
    return host || "source";
  } catch {
    return "source";
  }
}
