"use client";

import * as React from "react";
import { Binary, Braces, Clock3, Code2, ExternalLink, FileDiff, Globe2, Hash, KeyRound, Link2, Search, Shuffle, TextCursorInput } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { convertTimestamp, decodeBase64, decodeHtml, decodeUrl, encodeBase64, encodeHtml, encodeUrl, formatDiff, formatJson, formatJwt, generateLorem, hashAll, parseUrl } from "@/lib/tools";
import { cn } from "@/lib/utils";

const PINQUED = "https://pinqued.top/";
const L30ON = "https://l30on.top/dashboard/";

type ToolId = "url" | "base64" | "html" | "json" | "jwt" | "url-parser" | "timestamp" | "diff" | "hash" | "uuid" | "lorem";
type ToolAction = "encode" | "decode" | "format" | "generate" | "compare";
type Tool = { id: ToolId; name: string; description: string; icon: LucideIcon; color: string; featured?: boolean };

const tools: Tool[] = [
  { id: "url", name: "URL Encode / Decode", description: "Encode or decode URL strings", icon: Link2, color: "text-sky-300", featured: true },
  { id: "base64", name: "Base64", description: "Encode or decode UTF-8 text", icon: Binary, color: "text-violet-300", featured: true },
  { id: "json", name: "JSON Formatter", description: "Format and validate JSON", icon: Braces, color: "text-lime-300", featured: true },
  { id: "hash", name: "Hash Generator", description: "MD5 / SHA-1 / SHA-256 / SHA-512", icon: Hash, color: "text-orange-300", featured: true },
  { id: "uuid", name: "UUID Generator", description: "Generate random UUIDs", icon: Shuffle, color: "text-cyan-300", featured: true },
  { id: "html", name: "HTML Encode / Decode", description: "Escape or decode HTML entities", icon: Code2, color: "text-emerald-300", featured: true },
  { id: "jwt", name: "JWT Decoder", description: "Inspect header and payload locally", icon: KeyRound, color: "text-amber-300" },
  { id: "url-parser", name: "URL Parser", description: "Inspect URL parts and parameters", icon: Globe2, color: "text-blue-300" },
  { id: "timestamp", name: "Timestamp Converter", description: "Convert Unix timestamps and dates", icon: Clock3, color: "text-pink-300" },
  { id: "diff", name: "Text Diff", description: "Compare two texts line by line", icon: FileDiff, color: "text-rose-300" },
  { id: "lorem", name: "Lorem Ipsum", description: "Generate placeholder paragraphs", icon: TextCursorInput, color: "text-yellow-200" },
];

const originalLinks = [
  ["Recon", "https://pinqued.top/recon"], ["Terminal", "https://pinqued.top/terminal"], ["Files", "https://pinqued.top/files"],
  ["Dashboard", "https://pinqued.top/dashboard"], ["Apps", "https://pinqued.top/app"], ["Pinqued home", PINQUED], ["l30on dashboard", L30ON],
] as const;

const actions: Partial<Record<ToolId, Array<[ToolAction, string]>>> = {
  url: [["encode", "Encode"], ["decode", "Decode"]], base64: [["encode", "Encode"], ["decode", "Decode"]], html: [["encode", "Encode"], ["decode", "Decode"]],
  json: [["format", "Format"]], jwt: [["decode", "Decode"]], "url-parser": [["format", "Parse"]], timestamp: [["format", "Convert"]],
  diff: [["compare", "Compare"]], hash: [["generate", "Generate"]], uuid: [["generate", "Generate"]], lorem: [["generate", "Generate"]],
};

function ToolCard({ tool, onSelect }: { tool: Tool; onSelect: (id: ToolId) => void }) {
  const Icon = tool.icon;
  return <button type="button" onClick={() => onSelect(tool.id)} className="flex items-start gap-3 rounded-[10px] border border-white/[.07] bg-white/[.015] px-4 py-4 text-left transition hover:border-violet-300/25 hover:bg-white/[.025]"><span className={cn("mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/[.06]", tool.color)}><Icon className="h-4 w-4" /></span><span><span className="block font-sans text-sm text-zinc-100">{tool.name}</span><span className="mt-1 block font-sans text-xs text-zinc-500">{tool.description}</span></span></button>;
}

export function ToolsWorkspace() {
  const [active, setActive] = React.useState<ToolId | null>(null);
  const [search, setSearch] = React.useState("");
  const [input, setInput] = React.useState("");
  const [secondInput, setSecondInput] = React.useState("");
  const [output, setOutput] = React.useState("");
  const [paragraphs, setParagraphs] = React.useState("1");
  const [sentences, setSentences] = React.useState("3");
  const [error, setError] = React.useState<string | null>(null);
  const activeTool = tools.find((tool) => tool.id === active);
  const filtered = tools.filter((tool) => !search.trim() || `${tool.name} ${tool.description}`.toLowerCase().includes(search.trim().toLowerCase()));

  function choose(id: ToolId) { setActive(id); setInput(""); setSecondInput(""); setOutput(""); setError(null); }
  function back() { setActive(null); setInput(""); setSecondInput(""); setOutput(""); setError(null); }
  async function run(action: ToolAction) {
    if (!active) return;
    setError(null); setOutput("");
    try {
      if (active === "url") setOutput(action === "encode" ? encodeUrl(input) : decodeUrl(input));
      else if (active === "base64") setOutput(action === "encode" ? encodeBase64(input) : decodeBase64(input));
      else if (active === "html") setOutput(action === "encode" ? encodeHtml(input) : decodeHtml(input));
      else if (active === "json") setOutput(formatJson(input));
      else if (active === "jwt") setOutput(formatJwt(input));
      else if (active === "url-parser") setOutput(parseUrl(input));
      else if (active === "timestamp") setOutput(convertTimestamp(input));
      else if (active === "diff") setOutput(formatDiff(input, secondInput));
      else if (active === "hash") setOutput(await hashAll(input));
      else if (active === "uuid") setOutput(Array.from({ length: 5 }, () => crypto.randomUUID()).join("\n"));
      else if (active === "lorem") setOutput(generateLorem(Number(paragraphs), Number(sentences)));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not process that input."); }
  }

  return <div className="mx-auto max-w-[1100px]">
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4"><div><h1 className="font-sans text-3xl font-semibold tracking-tight text-zinc-100 sm:text-[34px]">Tools</h1><p className="mt-2 font-mono text-[10px] uppercase tracking-[.14em] text-zinc-600">Powered by / inspired by <a href={PINQUED} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-violet-300">Pinqued</a> + <a href={L30ON} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-violet-300">l30on dashboard</a></p><p className="mt-2 max-w-2xl font-sans text-xs text-zinc-500">Every local utility runs only in this browser. Authenticated Pinqued workspaces remain on their original site.</p></div><a href={PINQUED} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-sans text-xs text-zinc-400 hover:text-violet-200">Open original <ExternalLink className="h-3 w-3" /></a></header>
    {active && activeTool ? <section className="rounded-[10px] border border-white/[.07] bg-white/[.015] p-5"><div className="mb-4 flex items-start justify-between gap-3"><div><h2 className="font-sans text-sm text-zinc-100">{activeTool.name}</h2><p className="mt-1 font-mono text-[10px] text-zinc-600">Local only · no input leaves this browser</p></div><button type="button" onClick={back} className="font-mono text-[10px] text-zinc-600 hover:text-zinc-300">Back to tools</button></div>
      {active === "diff" ? <div className="grid gap-3 sm:grid-cols-2"><label className="font-mono text-[10px] text-zinc-500">Original<textarea aria-label="Original text" value={input} onChange={(event) => setInput(event.target.value)} className="mt-2 min-h-40 w-full rounded-lg border border-white/[.07] bg-[#090a0e] p-3 font-mono text-[11px] text-zinc-300 outline-none focus:border-violet-300/30" /></label><label className="font-mono text-[10px] text-zinc-500">Updated<textarea aria-label="Updated text" value={secondInput} onChange={(event) => setSecondInput(event.target.value)} className="mt-2 min-h-40 w-full rounded-lg border border-white/[.07] bg-[#090a0e] p-3 font-mono text-[11px] text-zinc-300 outline-none focus:border-violet-300/30" /></label></div> : active === "lorem" ? <div className="grid max-w-md gap-3 sm:grid-cols-2"><label className="font-mono text-[10px] text-zinc-500">Paragraphs<input aria-label="Paragraphs" type="number" min="1" max="8" value={paragraphs} onChange={(event) => setParagraphs(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-white/[.07] bg-[#090a0e] px-3 font-mono text-[11px] text-zinc-300" /></label><label className="font-mono text-[10px] text-zinc-500">Sentences each<input aria-label="Sentences each" type="number" min="1" max="8" value={sentences} onChange={(event) => setSentences(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-white/[.07] bg-[#090a0e] px-3 font-mono text-[11px] text-zinc-300" /></label></div> : active !== "uuid" ? <textarea aria-label="Tool input" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Input…" className="min-h-32 w-full rounded-lg border border-white/[.07] bg-[#090a0e] p-3 font-mono text-[11px] text-zinc-300 outline-none focus:border-violet-300/30" /> : null}
      {active === "jwt" && <p className="mt-3 font-mono text-[10px] text-amber-200/60">Header and payload only. Signature verification is not performed.</p>}<div className="mt-3 flex flex-wrap gap-2">{(actions[active] || []).map(([action, label]) => <button key={action} type="button" onClick={() => void run(action)} className="h-9 rounded-lg border border-white/[.09] px-3 font-mono text-[10px] text-zinc-300 hover:border-violet-300/30 hover:text-violet-200">{label}</button>)}</div>{error && <p role="alert" className="mt-3 font-mono text-[10px] text-rose-300">{error}</p>}<textarea readOnly aria-label="Tool output" value={output} placeholder="Output…" className="mt-4 min-h-32 w-full rounded-lg border border-white/[.07] bg-[#090a0e] p-3 font-mono text-[11px] text-zinc-300" /></section> : <><label className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" /><input aria-label="Search tools" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tools…" className="h-11 w-full rounded-lg border border-white/[.07] bg-white/[.015] pl-10 pr-3 font-mono text-[11px] text-zinc-300 outline-none focus:border-violet-300/30" /></label><ToolGrid title="Pinned / Main tools" tools={filtered.filter((tool) => tool.featured)} onSelect={choose} /><ToolGrid title="More local utilities" tools={filtered.filter((tool) => !tool.featured)} onSelect={choose} extraClass="mt-8" />{filtered.length === 0 && <p className="mt-6 rounded-lg border border-dashed border-white/[.08] p-5 font-mono text-[10px] text-zinc-600">No local tools match that search.</p>} {!search.trim() && <section className="mt-8"><h2 className="mb-3 font-mono text-[10px] uppercase tracking-[.16em] text-zinc-500">Original workspaces</h2><div className="flex flex-wrap gap-2">{originalLinks.map(([name, href]) => <a key={href} href={href} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/[.07] px-3 font-mono text-[10px] text-zinc-400 hover:border-violet-300/25 hover:text-violet-200">{name} <ExternalLink className="h-3 w-3" /></a>)}</div></section>}</>}
    <footer className="mt-10 border-t border-white/[.06] pb-6 pt-5 font-mono text-[10px] leading-5 text-zinc-600">Original tools by <a href={PINQUED} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-violet-300">Pinqued</a>{" · "}dashboard inspiration from <a href={L30ON} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-violet-300">l30on.top/dashboard</a></footer>
  </div>;
}

function ToolGrid({ title, tools, onSelect, extraClass = "mt-6" }: { title: string; tools: Tool[]; onSelect: (id: ToolId) => void; extraClass?: string }) {
  if (!tools.length) return null;
  return <section className={extraClass}><h2 className="mb-3 font-mono text-[10px] uppercase tracking-[.16em] text-zinc-500">{title}</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{tools.map((tool) => <ToolCard key={tool.id} tool={tool} onSelect={onSelect} />)}</div></section>;
}
