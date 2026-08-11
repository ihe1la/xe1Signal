"use client";

import * as React from "react";
import { FindingsWorkspace } from "@/components/findings-workspace";
import { SnippetsWorkspace } from "@/components/snippets-workspace";
import { cn } from "@/lib/utils";

type ToolsTab = "findings" | "snippets";

export function ToolsWorkspace() {
  const [tab, setTab] = React.useState<ToolsTab>("findings");

  return (
    <div className="mx-auto max-w-[1200px]">
      <header className="mb-6">
        <h1 className="font-sans text-3xl font-semibold tracking-tight text-zinc-100 sm:text-[34px]">Tools</h1>
        <p className="mt-2 font-sans text-sm text-zinc-500">
          Local lab for findings and text transforms.
        </p>
      </header>

      <div className="mb-6 flex gap-1 rounded-xl border border-white/[.08] bg-white/[.02] p-1" role="tablist" aria-label="Tools sections">
        {(
          [
            ["findings", "Findings"],
            ["snippets", "Snippets"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              "flex-1 rounded-lg px-4 py-2.5 font-sans text-sm transition",
              tab === id ? "bg-violet-500/15 text-zinc-100" : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "findings" ? <FindingsWorkspace /> : <SnippetsWorkspace />}
    </div>
  );
}
