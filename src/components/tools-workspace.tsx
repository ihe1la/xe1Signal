"use client";

import * as React from "react";
import { Binary, Braces, ExternalLink, Hash, Link2, Shuffle } from "lucide-react";
import { TargetsMindmap } from "@/components/targets-mindmap";
import { cn } from "@/lib/utils";

const PINQUED = "https://pinqued.top/";
const L30ON = "https://l30on.top/dashboard/";

type ToolId = "url" | "base64" | "json" | "hash" | "uuid";
type ToolsTab = "targets" | "utilities";

const tools: Array<{ id: ToolId; name: string; description: string; icon: typeof Link2; className: string }> = [
  { id: "url", name: "URL Encode / Decode", description: "Encode or decode URL strings", icon: Link2, className: "text-sky-300" },
  { id: "base64", name: "Base64", description: "Encode or decode Base64 strings", icon: Binary, className: "text-violet-300" },
  { id: "json", name: "JSON Formatter", description: "Format and validate JSON", icon: Braces, className: "text-lime-300" },
  { id: "hash", name: "Hash Generator", description: "SHA-1 / SHA-256 / SHA-512", icon: Hash, className: "text-orange-300" },
  { id: "uuid", name: "UUID Generator", description: "Generate random UUIDs", icon: Shuffle, className: "text-cyan-300" },
];

const pinquedLinks = [
  { name: "Recon", href: "https://pinqued.top/recon" },
  { name: "Terminal", href: "https://pinqued.top/terminal" },
  { name: "Files", href: "https://pinqued.top/files" },
  { name: "Dashboard", href: "https://pinqued.top/dashboard" },
  { name: "Apps", href: "https://pinqued.top/app" },
];

function hex(buf: ArrayBuffer) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function ToolsWorkspace() {
  const [tab, setTab] = React.useState<ToolsTab>("targets");
  const [active, setActive] = React.useState<ToolId | null>(null);
  const [input, setInput] = React.useState("");
  const [output, setOutput] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  function reset() {
    setActive(null);
    setInput("");
    setOutput("");
    setError(null);
  }

  async function run(action: "encode" | "decode" | "format" | "hash" | "uuid") {
    setError(null);
    try {
      if (action === "uuid") {
        setOutput(Array.from({ length: 5 }, () => crypto.randomUUID()).join("\n"));
        return;
      }
      if (action === "hash") {
        const data = new TextEncoder().encode(input);
        const [sha1, sha256, sha512] = await Promise.all([
          crypto.subtle.digest("SHA-1", data),
          crypto.subtle.digest("SHA-256", data),
          crypto.subtle.digest("SHA-512", data),
        ]);
        setOutput(`SHA-1\n${hex(sha1)}\n\nSHA-256\n${hex(sha256)}\n\nSHA-512\n${hex(sha512)}`);
        return;
      }
      if (action === "format") {
        setOutput(JSON.stringify(JSON.parse(input), null, 2));
        return;
      }
      if (active === "url") {
        setOutput(action === "encode" ? encodeURIComponent(input) : decodeURIComponent(input));
        return;
      }
      if (active === "base64") {
        setOutput(action === "encode" ? btoa(unescape(encodeURIComponent(input))) : decodeURIComponent(escape(atob(input))));
      }
    } catch {
      setError("Could not process that input.");
      setOutput("");
    }
  }

  return (
    <div className="mx-auto max-w-[1300px]">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-sans text-3xl font-semibold tracking-tight text-zinc-100 sm:text-[34px]">Tools</h1>
          <p className="mt-2 font-sans text-sm text-zinc-500">
            Target mindmaps and lightweight utilities inspired by{" "}
            <a href={PINQUED} target="_blank" rel="noopener noreferrer" className="text-zinc-400 transition hover:text-violet-300">Pinqued</a>
            {" · "}
            <a href={L30ON} target="_blank" rel="noopener noreferrer" className="text-zinc-400 transition hover:text-violet-300">l30on.top/dashboard</a>
          </p>
        </div>
        <a href={PINQUED} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-sans text-xs text-zinc-400 transition hover:text-violet-200">
          Open original <ExternalLink className="h-3 w-3" />
        </a>
      </header>

      <div className="mb-6 flex gap-1 rounded-lg border border-white/[.07] bg-white/[.015] p-1">
        {([
          ["targets", "Targets"],
          ["utilities", "Utilities"],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => { setTab(id); if (id === "utilities") reset(); }}
            className={cn(
              "flex-1 rounded-md px-4 py-2 font-mono text-[11px] transition",
              tab === id ? "bg-white/[.06] text-zinc-100" : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "targets" ? (
        <TargetsMindmap />
      ) : active ? (
        <section className="rounded-[10px] border border-white/[.07] bg-white/[.015] p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-sans text-sm text-zinc-100">{tools.find((t) => t.id === active)?.name}</h2>
            <button type="button" onClick={reset} className="font-mono text-[10px] text-zinc-600 hover:text-zinc-300">Back</button>
          </div>
          {active !== "uuid" && (
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Input…"
              className="min-h-32 w-full resize-y rounded-lg border border-white/[.07] bg-[#090a0e] p-3 font-mono text-[11px] text-zinc-300 outline-none focus:border-violet-300/30"
            />
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {(active === "url" || active === "base64") && (
              <>
                <button type="button" onClick={() => void run("encode")} className="h-9 rounded-lg border border-white/[.09] px-3 font-mono text-[10px] text-zinc-300 hover:border-violet-300/30 hover:text-violet-200">Encode</button>
                <button type="button" onClick={() => void run("decode")} className="h-9 rounded-lg border border-white/[.09] px-3 font-mono text-[10px] text-zinc-300 hover:border-violet-300/30 hover:text-violet-200">Decode</button>
              </>
            )}
            {active === "json" && <button type="button" onClick={() => void run("format")} className="h-9 rounded-lg border border-white/[.09] px-3 font-mono text-[10px] text-zinc-300 hover:border-violet-300/30 hover:text-violet-200">Format</button>}
            {active === "hash" && <button type="button" onClick={() => void run("hash")} className="h-9 rounded-lg border border-white/[.09] px-3 font-mono text-[10px] text-zinc-300 hover:border-violet-300/30 hover:text-violet-200">Generate</button>}
            {active === "uuid" && <button type="button" onClick={() => void run("uuid")} className="h-9 rounded-lg border border-white/[.09] px-3 font-mono text-[10px] text-zinc-300 hover:border-violet-300/30 hover:text-violet-200">Generate</button>}
          </div>
          {error && <p role="alert" className="mt-3 font-mono text-[10px] text-rose-300">{error}</p>}
          <textarea readOnly value={output} placeholder="Output…" className="mt-4 min-h-32 w-full resize-y rounded-lg border border-white/[.07] bg-[#090a0e] p-3 font-mono text-[11px] text-zinc-300 outline-none" />
        </section>
      ) : (
        <>
          <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[.16em] text-zinc-500">Pinned / Main tools</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <button key={tool.id} type="button" onClick={() => { setActive(tool.id); setInput(""); setOutput(""); setError(null); }} className="flex items-start gap-3 rounded-[10px] border border-white/[.07] bg-white/[.015] px-4 py-4 text-left transition hover:border-violet-300/25">
                  <span className={cn("mt-0.5 grid h-8 w-8 place-items-center rounded-lg border border-white/[.06]", tool.className)}><Icon className="h-4 w-4" /></span>
                  <span>
                    <span className="block font-sans text-sm text-zinc-100">{tool.name}</span>
                    <span className="mt-1 block font-sans text-xs text-zinc-500">{tool.description}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <h2 className="mb-3 mt-8 font-mono text-[10px] uppercase tracking-[.16em] text-zinc-500">More tools · Pinqued</h2>
          <div className="flex flex-wrap gap-2">
            {pinquedLinks.map((item) => (
              <a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/[.07] px-3 font-mono text-[10px] text-zinc-400 transition hover:border-violet-300/25 hover:text-violet-200">
                {item.name} <ExternalLink className="h-3 w-3" />
              </a>
            ))}
            <a href={L30ON} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-dashed border-white/[.09] px-3 font-mono text-[10px] text-zinc-500 transition hover:text-violet-200">
              l30on dashboard <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </>
      )}

      <p className="mt-10 border-t border-white/[.06] pt-5 font-mono text-[10px] text-zinc-600">
        Original tools by <a href={PINQUED} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-violet-300">Pinqued</a>
        {" · "}
        <a href={PINQUED} target="_blank" rel="noopener noreferrer" className="hover:text-violet-300">{PINQUED}</a>
      </p>
    </div>
  );
}
