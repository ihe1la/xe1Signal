"use client";

import * as React from "react";
import {
  Archive,
  Code2,
  Crosshair,
  Files,
  FolderOpen,
  Link2,
  MessageCircle,
  ScrollText,
  Terminal,
  type LucideIcon,
} from "lucide-react";
import { PinquedReconWorkspace } from "@/components/pinqued-recon-workspace";
import { RelayWorkspace } from "@/components/relay-workspace";
import { SnippetsWorkspace } from "@/components/snippets-workspace";
import { StashWorkspace } from "@/components/stash-workspace";
import { cn } from "@/lib/utils";

type PinquedTool = "recon" | "snippets" | "relay" | "stash";

type SidebarItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  tool?: PinquedTool;
};

const sidebarItems: SidebarItem[] = [
  { id: "explorer", label: "File Explorer", icon: FolderOpen },
  { id: "terminal", label: "Terminal", icon: Terminal },
  { id: "recon", label: "Recon", icon: Crosshair, tool: "recon" },
  { id: "snippets", label: "Snippets", icon: Code2, tool: "snippets" },
  { id: "relay", label: "Relay", icon: Link2, tool: "relay" },
  { id: "stash", label: "Stash", icon: Archive, tool: "stash" },
  { id: "logs", label: "Logs", icon: ScrollText },
  { id: "files", label: "Files", icon: Files },
  { id: "party", label: "Party", icon: MessageCircle },
];

export function PinquedWorkspace() {
  const [activeTool, setActiveTool] = React.useState<PinquedTool>("recon");

  return (
    <div aria-label="Pinqued tools section" className="-mx-2 font-mono sm:-mx-4 lg:-mx-7">
      <div className="overflow-hidden border border-[#292830] bg-[#09090c] shadow-[0_20px_55px_rgba(0,0,0,.28)]">
        <div className="grid min-h-[760px] grid-cols-[68px_minmax(0,1fr)] sm:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="border-r border-[#292830] bg-[#09090c]">
            <div className="flex h-[62px] items-center justify-center border-b border-[#292830] sm:justify-start sm:px-5">
              <span className="relative block h-5 w-5 rotate-45 border-l-2 border-t-2 border-[#eee8f2] after:absolute after:-bottom-1 after:-right-1 after:h-3 after:w-3 after:border-b-2 after:border-r-2 after:border-[#eee8f2]" aria-label="Pinqued mark" />
            </div>
            <nav aria-label="Pinqued navigation" className="space-y-1 px-2 py-4 sm:px-3">
              {sidebarItems.map((item) => {
                const selected = item.tool === activeTool;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-current={selected ? "page" : undefined}
                    onClick={() => item.tool && setActiveTool(item.tool)}
                    className={cn(
                      "flex h-10 w-full items-center justify-center gap-3 border px-0 text-left text-[#a19aa7] transition sm:justify-start sm:px-3",
                      selected ? "border-[#4a4651] bg-[#2b2930] text-[#f2edf5]" : "border-transparent hover:bg-white/[.035] hover:text-[#ece6ef]",
                    )}
                  >
                    <Icon className={cn("h-[17px] w-[17px] shrink-0", selected && "text-[#f0e5f4]")} />
                    <span className="hidden text-[11px] sm:inline">{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="absolute bottom-0 hidden w-[220px] border-t border-[#292830] bg-[#0c0c10] p-3 sm:block">
              <div className="flex items-center gap-3 border border-[#36333c] px-3 py-2.5"><span className="grid h-7 w-7 place-items-center rounded-full border border-[#5a5261] bg-[#24202a] text-[10px] text-[#e6ddec]">h</span><div className="min-w-0"><p className="text-[11px] text-[#eee8f2]">hela</p><p className="mt-1 text-[9px] text-[#77717e]">local workspace</p></div><span className="ml-auto text-[#a29aa8]">···</span></div>
            </div>
          </aside>

          <main className="min-w-0 bg-[#09090c] p-3 sm:p-5">
            {activeTool === "recon" ? <PinquedReconWorkspace /> : null}
            {activeTool === "snippets" ? <SnippetsWorkspace /> : null}
            {activeTool === "relay" ? <RelayWorkspace /> : null}
            {activeTool === "stash" ? <StashWorkspace /> : null}
          </main>
        </div>
        <footer className="flex items-center justify-between border-t border-[#292830] bg-[#101014] px-4 py-2 text-[9px] uppercase tracking-[.13em] text-[#6f6975]">
          <span>Local workspace · no iframe</span>
          <span>Credit: <a href="https://pinqued.top/" target="_blank" rel="noopener noreferrer" className="text-[#a79bb0] hover:text-white">Pinqued ↗</a></span>
        </footer>
      </div>
    </div>
  );
}
