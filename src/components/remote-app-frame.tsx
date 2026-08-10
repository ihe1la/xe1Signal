"use client";

import * as React from "react";
import { Maximize2, RefreshCw } from "lucide-react";

type RemoteAppFrameProps = {
  title: string;
  url: string;
  mode?: "embed" | "browser-session";
  remoteLabel?: string;
  showOriginalLink?: boolean;
};

export function RemoteAppFrame({ title, url, mode = "embed", remoteLabel, showOriginalLink = true }: RemoteAppFrameProps) {
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const [loadState, setLoadState] = React.useState<"loading" | "loaded" | "error">("loading");
  const [reloadKey, setReloadKey] = React.useState(0);

  const remoteName = remoteLabel || (title.toLowerCase() === "study" ? "tracker" : "dashboard");

  if (mode === "browser-session") {
    return (
      <section className="flex h-[calc(100dvh-12.75rem)] min-h-[420px] flex-col gap-4 lg:h-[calc(100dvh-10rem)] lg:min-h-[560px]">
        <div className="flex shrink-0 items-center justify-between gap-3">
          <h1 className="font-mono text-2xl tracking-tight text-zinc-100 sm:text-[30px]">{title}</h1>
          {showOriginalLink && <a href={url} target="_self" rel="noreferrer" className="font-mono text-[10px] text-zinc-500 transition hover:text-zinc-200">
            Open original ↗
          </a>}
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden rounded-[10px] border border-white/[.07] bg-[#0b0c10]">
          <a
            href={url}
            target="_self"
            rel="noreferrer"
            className="grid h-full place-items-center px-6 text-center transition hover:bg-white/[.02]"
          >
            <span>
              <span className="block font-mono text-[11px] text-zinc-400">Open {remoteName} in this browser session ↗</span>
              <span className="mt-2 block font-mono text-[9px] text-zinc-600">Uses your existing {remoteName} login.</span>
            </span>
          </a>
        </div>
      </section>
    );
  }

  function reload() {
    setLoadState("loading");
    setReloadKey((key) => key + 1);
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    void iframeRef.current?.requestFullscreen().catch(() => undefined);
  }

  return (
    <section className="flex h-[calc(100dvh-12.75rem)] min-h-[420px] flex-col gap-4 lg:h-[calc(100dvh-10rem)] lg:min-h-[560px]">
      <div className="flex shrink-0 items-center justify-between gap-3">
        <h1 className="font-mono text-2xl tracking-tight text-zinc-100 sm:text-[30px]">{title}</h1>
        <div className="flex items-center gap-1.5">
          {loadState === "loaded" && <span className="mr-2 font-mono text-[9px] text-zinc-600">Connected</span>}
          <button type="button" onClick={reload} aria-label={`Reload ${title}`} className="rounded-md p-2 text-zinc-600 transition hover:bg-white/[.04] hover:text-zinc-300">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={toggleFullscreen} aria-label={`Fullscreen ${title}`} className="rounded-md p-2 text-zinc-600 transition hover:bg-white/[.04] hover:text-zinc-300">
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          {showOriginalLink && <a href={url} target="_blank" rel="noreferrer" className="ml-1 font-mono text-[10px] text-zinc-500 transition hover:text-zinc-200">Open original ↗</a>}
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-[10px] border border-white/[.07] bg-[#0b0c10]">
        {loadState === "loading" && <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-md border border-white/[.06] bg-[#0b0c10]/90 px-2 py-1 font-mono text-[9px] text-zinc-600" aria-live="polite">Loading {remoteName}...</div>}
        {loadState === "error" ? (
          <div className="grid h-full place-items-center px-6 text-center">
            <div>
              <p className="font-mono text-[11px] text-zinc-400">{title} {remoteName} cannot be displayed inside xe1Signal.</p>
              <a href={url} target="_blank" rel="noreferrer" className="mt-3 font-mono text-[10px] text-violet-300 hover:text-violet-200">Open {remoteName} ↗</a>
            </div>
          </div>
        ) : (
          <iframe
            key={reloadKey}
            ref={iframeRef}
            src={url}
            title={title}
            onLoad={() => setLoadState("loaded")}
            onError={() => setLoadState("error")}
            allow="clipboard-read; clipboard-write"
            referrerPolicy="strict-origin-when-cross-origin"
            className="h-full w-full border-0 bg-[#08090d]"
          />
        )}
      </div>
    </section>
  );
}
