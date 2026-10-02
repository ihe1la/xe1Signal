"use client";

import * as React from "react";
import { Maximize2, RotateCw } from "lucide-react";

const METHODOLOGY_SRC = "/recon-methodology.html";

export function ReconMethodologyWorkspace() {
  const frameRef = React.useRef<HTMLIFrameElement>(null);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [loaded, setLoaded] = React.useState(false);

  const openFullscreen = React.useCallback(() => {
    const frame = frameRef.current;
    const request = frame?.requestFullscreen?.();
    if (request && typeof request.catch === "function") {
      request.catch(() => undefined);
    }
  }, []);

  return (
    <section aria-label="Recon methodology graph" className="font-mono">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] leading-5 text-zinc-500">
          Interactive recon pipeline. Set your target and org, then copy any command straight into your shell.
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            className="flex items-center gap-1.5 rounded-md border border-white/[.08] px-2.5 py-1.5 text-[11px] text-zinc-400 transition hover:border-violet-400/50 hover:text-zinc-100"
          >
            <RotateCw className="h-3 w-3" />
            Reload
          </button>
          <button
            type="button"
            onClick={openFullscreen}
            className="flex items-center gap-1.5 rounded-md border border-white/[.08] px-2.5 py-1.5 text-[11px] text-zinc-400 transition hover:border-violet-400/50 hover:text-zinc-100"
          >
            <Maximize2 className="h-3 w-3" />
            Fullscreen
          </button>
        </div>
      </div>

      <div className="relative h-[78vh] min-h-[620px] overflow-hidden rounded-xl border border-white/[.08] bg-[#090714]">
        {!loaded ? (
          <div className="absolute inset-0 animate-pulse bg-white/[.02]" aria-label="Loading recon methodology" />
        ) : null}
        <iframe
          key={reloadKey}
          ref={frameRef}
          src={METHODOLOGY_SRC}
          title="Recon methodology graph"
          onLoad={() => setLoaded(true)}
          className="h-full w-full border-0"
        />
      </div>
    </section>
  );
}
