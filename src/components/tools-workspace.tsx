"use client";

import { TargetsMindmap } from "@/components/targets-mindmap";

export function ToolsWorkspace() {
  return (
    <div className="mx-auto max-w-[1300px]">
      <header className="mb-6">
        <h1 className="font-sans text-3xl font-semibold tracking-tight text-zinc-100 sm:text-[34px]">Tools</h1>
        <p className="mt-2 font-sans text-sm text-zinc-500">
          Local XMind-style target maps with an Obsidian vault for investigation notes.
        </p>
      </header>

      <TargetsMindmap />

      <p className="mt-10 border-t border-white/[.06] pt-5 font-mono text-[10px] text-zinc-600">
        Your target map and vault stay on this device only.
      </p>
    </div>
  );
}
