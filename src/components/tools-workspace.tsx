"use client";

import * as React from "react";
import { DumpNotesWorkspace } from "@/components/dump-notes-workspace";
import { FindingsWorkspace } from "@/components/findings-workspace";
import { PinquedWorkspace } from "@/components/pinqued-workspace";
import { Th3l30Workspace } from "@/components/th3l30-workspace";
import { cn } from "@/lib/utils";

type ToolsTab = "findings" | "dump-notes" | "pinqued" | "th3l30";

const tabs = [
  ["findings", "Findings"],
  ["dump-notes", "Dump Notes"],
  ["pinqued", "Pinqued"],
  ["th3l30", "th3l30"],
] as const;

export function ToolsWorkspace() {
  const [tab, setTab] = React.useState<ToolsTab>("findings");

  return (
    <div className="mx-auto max-w-[1200px]">
      <header className="mb-6">
        <h1 className="font-sans text-3xl font-semibold tracking-tight text-zinc-100 sm:text-[34px]">Tools</h1>
        <p className="mt-2 font-sans text-sm text-zinc-500">
          Local findings, dump notes, Pinqued, and th3l30 workspaces.
        </p>
      </header>

      <div
        className="mb-6 flex flex-wrap gap-1 rounded-xl border border-white/[.08] bg-white/[.02] p-1"
        role="tablist"
        aria-label="Tools sections"
      >
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              "min-w-[7.5rem] flex-1 rounded-lg px-4 py-2.5 font-sans text-sm transition",
              tab === id ? "bg-violet-500/15 text-zinc-100" : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "findings" ? <FindingsWorkspace /> : null}
      {tab === "dump-notes" ? <DumpNotesWorkspace /> : null}
      {tab === "pinqued" ? <PinquedWorkspace /> : null}
      {tab === "th3l30" ? <Th3l30Workspace /> : null}
    </div>
  );
}
