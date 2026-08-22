"use client";

import * as React from "react";
import { Archive, Code2, Link2, Target } from "lucide-react";
import { DumpNotesWorkspace } from "@/components/dump-notes-workspace";
import { FindingsWorkspace } from "@/components/findings-workspace";
import { RelayWorkspace } from "@/components/relay-workspace";
import { SnippetsWorkspace } from "@/components/snippets-workspace";
import { cn } from "@/lib/utils";

type PinquedTool = "recon" | "snippets" | "relay" | "stash";

const tools: ReadonlyArray<readonly [PinquedTool, string, string, typeof Target]> = [
  ["recon", "Recon", "Capture and map findings", Target],
  ["snippets", "Snippets", "Run local transforms", Code2],
  ["relay", "Relay", "Inspect public responses", Link2],
  ["stash", "Stash", "Keep notes and exports", Archive],
];

export function PinquedWorkspace() {
  const [activeTool, setActiveTool] = React.useState<PinquedTool>("recon");
  const active = tools.find(([id]) => id === activeTool) ?? tools[0];

  return (
    <div aria-label="Pinqued tools section" className="mx-auto max-w-[1280px]">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-mono text-xl tracking-tight text-zinc-100">Pinqued tools</h2>
          <p className="mt-1 font-mono text-[10px] text-zinc-600">
            Native workspaces inspired by{" "}
            <a href="https://pinqued.top/" target="_blank" rel="noopener noreferrer" className="text-violet-300 hover:text-violet-200">
              Pinqued ↗
            </a>
          </p>
        </div>
        <span className="font-mono text-[9px] uppercase tracking-[.14em] text-zinc-700">Local · no iframe</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="Pinqued tools navigation" className="h-fit rounded-2xl border border-white/[.08] bg-[#08090d] p-2">
          {tools.map(([id, label, hint, Icon]) => {
            const selected = id === activeTool;
            return (
              <button
                key={id}
                type="button"
                aria-current={selected ? "page" : undefined}
                onClick={() => setActiveTool(id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition",
                  selected ? "bg-white/[.05] text-zinc-100" : "text-zinc-500 hover:bg-white/[.03] hover:text-zinc-300",
                )}
              >
                <Icon className={cn("h-[18px] w-[18px] shrink-0", selected && "text-violet-300")} />
                <span className="min-w-0">
                  <span className="block font-mono text-[12px]">{label}</span>
                  <span className="mt-1 block truncate font-sans text-[10px] text-zinc-600">{hint}</span>
                </span>
              </button>
            );
          })}
        </nav>

        <section aria-label={`${active[1]} workspace`} className="min-w-0">
          {activeTool === "recon" ? <FindingsWorkspace /> : null}
          {activeTool === "snippets" ? <SnippetsWorkspace /> : null}
          {activeTool === "relay" ? <RelayWorkspace /> : null}
          {activeTool === "stash" ? <DumpNotesWorkspace /> : null}
        </section>
      </div>

      <p className="mt-5 text-center font-mono text-[9px] text-zinc-700">
        Credit: <a href="https://pinqued.top/" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-zinc-300">Pinqued</a>
      </p>
    </div>
  );
}
