"use client";

import * as React from "react";
import { Archive, Code2, FolderOpen, Link2, List, Network, Terminal, type LucideIcon } from "lucide-react";
import { FilesWorkspace } from "@/components/files-workspace";
import { LogsWorkspace } from "@/components/logs-workspace";
import { PinquedSession } from "@/components/pinqued-session";
import { RelayWorkspace } from "@/components/relay-workspace";
import { SnippetsWorkspace } from "@/components/snippets-workspace";
import { StashWorkspace } from "@/components/stash-workspace";
import { SubkeeperWorkspace } from "@/components/subkeeper-workspace";
import { TerminalWorkspace } from "@/components/terminal-workspace";
import { cn } from "@/lib/utils";

type PinquedTool = "snippets" | "stash" | "logs" | "files" | "relay" | "terminal" | "subkeeper";
type SidebarItem = { id: PinquedTool; label: string; icon: LucideIcon };

const sidebarItems: SidebarItem[] = [
  { id: "snippets", label: "Snippets", icon: Code2 },
  { id: "stash", label: "Stash", icon: Archive },
  { id: "logs", label: "Logs", icon: List },
  { id: "files", label: "Files", icon: FolderOpen },
  { id: "relay", label: "Relay", icon: Link2 },
  { id: "terminal", label: "Terminal", icon: Terminal },
  { id: "subkeeper", label: "SubKeeper", icon: Network },
];

export function PinquedWorkspace() {
  const [activeTool, setActiveTool] = React.useState<PinquedTool>("snippets");

  return (
    <div aria-label="Pinqued tools section" className="pinqued-readable -mx-2 font-mono sm:-mx-4 lg:-mx-7">
      <div className="overflow-hidden border border-[#292830] bg-[#09090c] shadow-[0_20px_55px_rgba(0,0,0,.28)]">
        <div className="grid min-h-[760px] grid-cols-[68px_minmax(0,1fr)] sm:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="relative border-r border-[#292830] bg-[#09090c]">
            <div className="flex h-[62px] items-center justify-center border-b border-[#292830] sm:justify-start sm:px-5">
              <span className="hidden text-[14px] font-semibold tracking-[-.03em] text-[#f0ebf4] sm:inline">Pinqued</span>
              <span className="text-[15px] font-semibold text-[#f0ebf4] sm:hidden" aria-label="Pinqued">P</span>
            </div>
            <nav aria-label="Pinqued navigation" className="space-y-1 px-2 py-4 sm:px-3">
              {sidebarItems.map((item) => {
                const selected = item.id === activeTool;
                const Icon = item.icon;
                return (
                  <button key={item.id} type="button" aria-current={selected ? "page" : undefined} onClick={() => setActiveTool(item.id)} className={cn("flex h-10 w-full items-center justify-center gap-3 border px-0 text-left text-[#a19aa7] transition sm:justify-start sm:px-3", selected ? "border-[#4a4651] bg-[#2b2930] text-[#f2edf5]" : "border-transparent hover:bg-white/[.035] hover:text-[#ece6ef]")}>
                    <Icon className={cn("h-[17px] w-[17px] shrink-0", selected && "text-[#f0e5f4]")} />
                    <span className="hidden text-[11px] sm:inline">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <main className="min-w-0 bg-[#09090c] p-3 sm:p-5">
            <PinquedSession>
              {activeTool === "snippets" ? <SnippetsWorkspace /> : null}
              {activeTool === "stash" ? <StashWorkspace /> : null}
              {activeTool === "logs" ? <LogsWorkspace /> : null}
              {activeTool === "files" ? <FilesWorkspace /> : null}
              {activeTool === "relay" ? <RelayWorkspace /> : null}
              {activeTool === "terminal" ? <TerminalWorkspace /> : null}
              {activeTool === "subkeeper" ? <SubkeeperWorkspace /> : null}
            </PinquedSession>
          </main>
        </div>
        <footer className="flex items-center justify-between border-t border-[#292830] bg-[#101014] px-4 py-2 text-[9px] uppercase tracking-[.13em] text-[#6f6975]">
          <span>Pinqued services</span>
          <span>Credit: <a href="https://pinqued.top/" target="_blank" rel="noopener noreferrer" className="text-[#a79bb0] hover:text-white">Pinqued ↗</a></span>
        </footer>
      </div>
    </div>
  );
}
