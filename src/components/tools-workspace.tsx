"use client";

import * as React from "react";
import {
  Binary,
  Braces,
  Clock3,
  Code2,
  ExternalLink,
  FileDiff,
  Globe2,
  Hash,
  KeyRound,
  Link2,
  Search,
  Shuffle,
  TextCursorInput,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  convertTimestamp,
  decodeBase64,
  decodeHtml,
  decodeJwt,
  encodeBase64,
  encodeHtml,
  formatDiff,
  formatJson,
  formatJwt,
  generateLorem,
  hashAll,
  parseUrl,
} from "@/lib/tools";
import { cn } from "@/lib/utils";

const PINQUED = "https://pinqued.top/";
const L30ON = "https://l30on.top/dashboard/";

type ToolId =
  | "url"
  | "base64"
  | "html"
  | "json"
  | "jwt"
  | "url-parser"
  | "timestamp"
  | "diff"
  | "hash"
  | "uuid"
  | "lorem";

type ToolAction = "encode" | "decode" | "format" | "generate" | "compare";

type ToolDefinition = {
  id: ToolId;
  name: string;
  description: string;
  icon: LucideIcon;
  className: string;
  featured?: boolean;
};

const localTools: ToolDefinition[] = [
  { id: "url", name: "URL Encode / Decode", description: "Encode or decode URL strings", icon: Link2, className: "text-sky-300", featured: true },
  { id: "base64", name: "Base64", description: "Encode or decode UTF-8 text", icon: Binary, className: "text-violet-300", featured: true },
  { id: "json", name: "JSON Formatter", description: "Format and validate JSON", icon: Braces, className: "text-lime-300", featured: true },
  { id: "hash", name: "Hash Generator", description: "MD5 / SHA-1 / SHA-256 / SHA-512", icon: Hash, className: "text-orange-300", featured: true },
  { id: "uuid", name: "UUID Generator", description: "Generate random UUIDs", icon: Shuffle, className: "text-cyan-300", featured: true },
  { id: "html", name: "HTML Encode / Decode", description: "Escape or decode HTML entities", icon: Code2, className: "text-emerald-300", featured: true },
  { id: "jwt", name: "JWT Decoder", description: "Inspect a JWT locally; no verification", icon: KeyRound, className: "text-amber-300" },
  { id: "url-parser", name: "URL Parser", description: "Inspect URL parts and parameters", icon: Globe2, className: "text-blue-300" },
  { id: "timestamp", name: "Timestamp Converter", description: "Convert Unix timestamps and dates", icon: Clock3, className: "text-pink-300" },
  { id: "diff", name: "Text Diff", description: "Compare two texts line by line", icon: FileDiff, className: "text-rose-300" },
  { id: "lorem", name: "Lorem Ipsum", description: "Generate placeholder paragraphs", icon: TextCursorInput, className: "text-yellow-200" },
];

const pinquedLinks = [
  { name: "Recon", href: "https://pinqued.top/recon" },
  { name: "Terminal", href: "https://pinqued.top/terminal" },
  { name: "Files", href: "https://pinqued.top/files" },
  { name: "Dashboard", href: "https://pinqued.top/dashboard" },
  { name: "Apps", href: "https://pinqued.top/app" },
];

const actionLabels: Partial<Record<ToolId, Array<{ action: ToolAction; label: string }>>> = {
  url: [{ action: "encode", label: "Encode" }, { action: "decode", label: "Decode" }],
  base64: [{ action: "encode", label: "Encode" }, { action: "decode", label: "Decode" }],
  html: [{ action: "encode", label: "Encode" }, { action: "decode", label: "Decode" }],
  json: [{ action: "format", label: "Format" }],
  jwt: [{ action: "decode", label: "Decode" }],
  "url-parser": [{ action: "format", label: "Parse" }],
  timestamp: [{ action: "format", label: "Convert" }],
  diff: [{ action: "compare", label: "Compare" }],
  hash: [{ action: "generate", label: "Generate" }],
  uuid: [{ action: "generate", label: "Generate" }],
  lorem: [{ action: "generate", label: "Generate" }],
};

function ToolCard({ tool, onSelect }: { tool: ToolDefinition; onSelect: (id: ToolId) => void }) {
  const Icon = tool.icon;
  return (
    <button
      type="button"
      onClick={() => onSelect(tool.id)}
      className="flex items-start gap-3 rounded-[10px] border border-white/[.07] bg-white/[.015] px-4 py-4 text-left transition hover:border-violet-300/25"
    >
      <span className={cn("mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/[.06]", tool.className)}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block font-sans text-sm text-zinc-100">{tool.name}</span>
        <span className="mt-1 block font-sans text-xs text-zinc-500">{tool.description}</span>
      </span>
    </button>
  );
}

export function ToolsWorkspace() {
  const [active, setActive] = React.useState<ToolId | null>(null);
  const [search, setSearch] = React.useState("");
  const [input, setInput] = React.useState("");
  const [secondaryInput, setSecondaryInput] = React.useState("");
  const [output, setOutput] = React.useState("");
  const [loremParagraphs, setLoremParagraphs] = React.useState("1");
  const [loremSentences, setLoremSentences] = React.useState("3");
  const [error, setError] = React.useState<string | null>(null);

  const activeTool = localTools.find((tool) => tool.id === active);
  const filteredTools = localTools.filter((tool) => {
    const query = search.trim().toLowerCase();
    return !query || `${tool.name} ${tool.description}`.toLowerCase().includes(query);
  });
  const featuredTools = filteredTools.filter((tool) => tool.featured);
  const moreLocalTools = filteredTools.filter((tool) => !tool.featured);

  function selectTool(id: ToolId) {
    setActive(id);
    setInput("");
    setSecondaryInput("");
    setOutput("");
    setError(null);
  }

  function reset() {
    setActive(null);
    setInput("");
    setSecondaryInput("");
    setOutput("");
    setError(null);
  }

  async function run(action: ToolAction) {
    if (!active) return;
    setError(null);
    setOutput("");
    try {
      switch (active) {
        case "url":
          setOutput(action === "encode" ? encodeURIComponent(input) : decodeURIComponent(input));
          return;
        case "base64":
          setOutput(action === "encode" ? encodeBase64(input) : decodeBase64(input));
          return;
        case "html":
          setOutput(action === "encode" ? encodeHtml(input) : decodeHtml(input));
          return;
        case "json":
          setOutput(formatJson(input));
          return;
        case "jwt":
          decodeJwt(input);
          setOutput(formatJwt(input));
          return;
        case "url-parser":
          setOutput(parseUrl(input));
          return;
        case "timestamp":
          setOutput(convertTimestamp(input));
          return;
        case "diff":
          setOutput(formatDiff(input, secondaryInput));
          return;
        case "hash":
          setOutput(await hashAll(input));
          return;
        case "uuid":
          setOutput(Array.from({ length: 5 }, () => crypto.randomUUID()).join("\n"));
          return;
        case "lorem":
          setOutput(generateLorem(Number(loremParagraphs), Number(loremSentences)));
          return;
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not process that input.");
    }
  }

  return (
    <div className="mx-auto max-w-[1100px]">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-sans text-3xl font-semibold tracking-tight text-zinc-100 sm:text-[34px]">Tools</h1>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[.14em] text-zinc-600">
            Utilities powered by / inspired by{" "}
            <a href={PINQUED} target="_blank" rel="noopener noreferrer" className="text-zinc-400 transition hover:text-violet-300">Pinqued</a>
          </p>
          <p className="mt-2 max-w-2xl font-sans text-xs text-zinc-500">
            Simple utilities run locally in this page. The collection is informed by{" "}
            <a href={L30ON} target="_blank" rel="noopener noreferrer" className="text-zinc-400 transition hover:text-violet-200">l30on.top/dashboard</a>
            . Authenticated Pinqued workspaces stay on the original site.
          </p>
        </div>
        <a href={PINQUED} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1.5 font-sans text-xs text-zinc-400 transition hover:text-violet-200">
          Open original <ExternalLink className="h-3 w-3" />
        </a>
      </header>

      {active && activeTool ? (
        <section className="rounded-[10px] border border-white/[.07] bg-white/[.015] p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-sans text-sm text-zinc-100">{activeTool.name}</h2>
              <p className="mt-1 font-mono text-[10px] text-zinc-600">Local only · no input is sent to a remote service</p>
            </div>
            <button type="button" onClick={reset} className="font-mono text-[10px] text-zinc-600 transition hover:text-zinc-300">Back</button>
          </div>

          {active === "diff" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="font-mono text-[10px] text-zinc-500">
                Original
                <textarea aria-label="Original text" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Original text…" className="mt-2 min-h-40 w-full resize-y rounded-lg border border-white/[.07] bg-[#090a0e] p-3 font-mono text-[11px] text-zinc-300 outline-none focus:border-violet-300/30" />
              </label>
              <label className="font-mono text-[10px] text-zinc-500">
                Updated
                <textarea aria-label="Updated text" value={secondaryInput} onChange={(event) => setSecondaryInput(event.target.value)} placeholder="Updated text…" className="mt-2 min-h-40 w-full resize-y rounded-lg border border-white/[.07] bg-[#090a0e] p-3 font-mono text-[11px] text-zinc-300 outline-none focus:border-violet-300/30" />
              </label>
            </div>
          ) : active === "lorem" ? (
            <div className="grid max-w-md gap-3 sm:grid-cols-2">
              <label className="font-mono text-[10px] text-zinc-500">
                Paragraphs
                <input aria-label="Paragraphs" type="number" min="1" max="8" value={loremParagraphs} onChange={(event) => setLoremParagraphs(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-white/[.07] bg-[#090a0e] px-3 font-mono text-[11px] text-zinc-300 outline-none focus:border-violet-300/30" />
              </label>
              <label className="font-mono text-[10px] text-zinc-500">
                Sentences each
                <input aria-label="Sentences each" type="number" min="1" max="8" value={loremSentences} onChange={(event) => setLoremSentences(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-white/[.07] bg-[#090a0e] px-3 font-mono text-[11px] text-zinc-300 outline-none focus:border-violet-300/30" />
              </label>
            </div>
          ) : active !== "uuid" ? (
            <textarea aria-label="Tool input" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Input…" className="min-h-32 w-full resize-y rounded-lg border border-white/[.07] bg-[#090a0e] p-3 font-mono text-[11px] text-zinc-300 outline-none focus:border-violet-300/30" />
          ) : null}

          {active === "jwt" && <p className="mt-3 font-mono text-[10px] text-amber-200/60">Decoding reads the header and payload only. It does not verify the signature.</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {(actionLabels[active] ?? []).map(({ action, label }) => (
              <button key={action} type="button" onClick={() => void run(action)} className="h-9 rounded-lg border border-white/[.09] px-3 font-mono text-[10px] text-zinc-300 transition hover:border-violet-300/30 hover:text-violet-200">{label}</button>
            ))}
          </div>
          {error && <p role="alert" className="mt-3 font-mono text-[10px] text-rose-300">{error}</p>}
          <textarea readOnly aria-label="Tool output" value={output} placeholder="Output…" className="mt-4 min-h-32 w-full resize-y rounded-lg border border-white/[.07] bg-[#090a0e] p-3 font-mono text-[11px] text-zinc-300 outline-none" />
        </section>
      ) : (
        <>
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
            <input aria-label="Search tools" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tools…" className="h-11 w-full rounded-lg border border-white/[.07] bg-white/[.015] pl-10 pr-3 font-mono text-[11px] text-zinc-300 outline-none transition placeholder:text-zinc-700 focus:border-violet-300/30" />
          </label>

          {featuredTools.length > 0 && (
            <section className="mt-6" aria-labelledby="main-tools-heading">
              <h2 id="main-tools-heading" className="mb-3 font-mono text-[10px] uppercase tracking-[.16em] text-zinc-500">Pinned / Main tools</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {featuredTools.map((tool) => <ToolCard key={tool.id} tool={tool} onSelect={selectTool} />)}
              </div>
            </section>
          )}

          {moreLocalTools.length > 0 && (
            <section className="mt-8" aria-labelledby="local-tools-heading">
              <h2 id="local-tools-heading" className="mb-3 font-mono text-[10px] uppercase tracking-[.16em] text-zinc-500">More local utilities</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {moreLocalTools.map((tool) => <ToolCard key={tool.id} tool={tool} onSelect={selectTool} />)}
              </div>
            </section>
          )}

          {filteredTools.length === 0 && <p className="mt-6 rounded-lg border border-dashed border-white/[.08] p-5 font-mono text-[10px] text-zinc-600">No local tools match that search.</p>}

          {!search.trim() && (
            <section className="mt-8" aria-labelledby="pinqued-tools-heading">
              <h2 id="pinqued-tools-heading" className="mb-3 font-mono text-[10px] uppercase tracking-[.16em] text-zinc-500">More tools · Pinqued workspace</h2>
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
            </section>
          )}
        </>
      )}

      <footer className="mt-10 border-t border-white/[.06] pt-5 font-mono text-[10px] leading-5 text-zinc-600">
        Original tools by <a href={PINQUED} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-violet-300">Pinqued</a>
        {" · "}dashboard inspiration from <a href={L30ON} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-violet-300">l30on.top/dashboard</a>
      </footer>
    </div>
  );
}
