"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

function WorkspaceLoading() {
  return <div className="h-72 animate-pulse rounded-xl border border-white/[.07] bg-white/[.015]" aria-label="Loading workspace" />;
}

const FindingsWorkspace = dynamic(
  () => import("@/components/findings-workspace").then((module) => module.FindingsWorkspace),
  { loading: WorkspaceLoading },
);
const DumpNotesWorkspace = dynamic(
  () => import("@/components/dump-notes-workspace").then((module) => module.DumpNotesWorkspace),
  { loading: WorkspaceLoading },
);
const PinquedWorkspace = dynamic(
  () => import("@/components/pinqued-workspace").then((module) => module.PinquedWorkspace),
  { loading: WorkspaceLoading },
);

type ToolsTab = "findings" | "dump-notes" | "pinqued";

const tabs = [
  ["findings", "Findings"],
  ["dump-notes", "Dump Notes"],
  ["pinqued", "Pinqued"],
] as const;

export function ToolsWorkspace() {
  const [tab, setTab] = React.useState<ToolsTab>("findings");

  return (
    <div className="mx-auto max-w-[1200px]">
      <header className="mb-6">
        <h1 className="font-sans text-3xl font-semibold tracking-tight text-zinc-100 sm:text-[34px]">Tools</h1>
        <p className="mt-2 font-sans text-sm text-zinc-500">
          Local findings, dump notes, and connected tools.
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
    </div>
  );
}
