"use client";

import { ExternalLink } from "lucide-react";

export function SubkeeperWorkspace() {
  return (
    <section aria-label="SubKeeper" className="font-mono text-[#e9e3ee]">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-[#2a2931] pb-4">
        <div>
          <h1 className="text-[25px] tracking-[-.04em] text-[#f0ebf4]">SubKeeper</h1>
          <p className="mt-1 text-[10px] text-[#77717e]">Connected tool from the l30on.top website.</p>
        </div>
        <a href="https://l30on.top/subkeeper/" target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center gap-2 border border-[#494452] bg-[#1a1920] px-3 text-[10px] text-[#b9b1be] hover:border-[#6a6270] hover:text-white">
          l30on.top <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </header>
      <iframe
        title="SubKeeper from l30on.top"
        src="/api/th3l30/subkeeper/"
        allow="clipboard-read; clipboard-write"
        allowFullScreen
        className="block min-h-[760px] w-full border border-[#2a2931] bg-[#090b0f]"
      />
    </section>
  );
}
