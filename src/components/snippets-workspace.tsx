"use client";

import * as React from "react";
import { ArrowLeftRight, Check, Copy, Filter, Plus, RefreshCw, Search } from "lucide-react";
import {
  convertTimestamp,
  decodeBase64,
  decodeHtml,
  decodeUrl,
  encodeBase64,
  encodeHtml,
  encodeUrl,
  formatDiff,
  formatJson,
  formatJwt,
  formatJsEndpoints,
  generateLorem,
  hashAll,
  jsEndpointBookmarklet,
  parseUrl,
} from "@/lib/tools";
import { cn } from "@/lib/utils";

type SnippetId =
  | "url-encode"
  | "url-decode"
  | "base64-encode"
  | "base64-decode"
  | "html-encode"
  | "html-decode"
  | "json"
  | "jwt"
  | "url-parse"
  | "hash"
  | "timestamp"
  | "uuid"
  | "diff"
  | "lorem"
  | "js-endpoints"
  | "js-endpoint-bookmarklet";

type Snippet = {
  id: SnippetId;
  name: string;
  hint: string;
  dual?: boolean;
  needsInput?: boolean;
  primaryLabel?: string;
  secondaryLabel?: string;
  primaryPlaceholder?: string;
  secondaryPlaceholder?: string;
};

const SNIPPETS: Snippet[] = [
  { id: "url-encode", name: "URL Encode", hint: "encodeURIComponent", needsInput: true },
  { id: "url-decode", name: "URL Decode", hint: "decodeURIComponent", needsInput: true },
  { id: "base64-encode", name: "Base64 Encode", hint: "UTF-8 → Base64", needsInput: true },
  { id: "base64-decode", name: "Base64 Decode", hint: "Base64 → UTF-8", needsInput: true },
  { id: "html-encode", name: "HTML Encode", hint: "Escape entities", needsInput: true },
  { id: "html-decode", name: "HTML Decode", hint: "Unescape entities", needsInput: true },
  { id: "json", name: "JSON Format", hint: "Pretty-print + validate", needsInput: true },
  { id: "jwt", name: "JWT Peek", hint: "Header + payload only", needsInput: true },
  { id: "url-parse", name: "URL Parse", hint: "Break a URL apart", needsInput: true },
  { id: "hash", name: "Hash", hint: "MD5 / SHA-1 / 256 / 512", needsInput: true },
  { id: "timestamp", name: "Timestamp", hint: "Unix ↔ date", needsInput: true },
  { id: "uuid", name: "UUID", hint: "Generate 5 UUIDs", needsInput: false },
  { id: "diff", name: "Text Diff", hint: "Before / after lines", dual: true, needsInput: true },
  {
    id: "js-endpoints",
    name: "JS Endpoints",
    hint: "LinkFinder from HTML/JS paste",
    dual: true,
    needsInput: true,
    primaryLabel: "HTML / JS",
    secondaryLabel: "Base URL (optional)",
    primaryPlaceholder: "Paste page HTML or JS…",
    secondaryPlaceholder: "https://target.example",
  },
  {
    id: "js-endpoint-bookmarklet",
    name: "Endpoint Bookmarklet",
    hint: "Fixed jhaddix LinkFinder — drag to bookmarks",
    needsInput: false,
  },
  { id: "lorem", name: "Lorem", hint: "Placeholder paragraphs", needsInput: false },
];

function generateUuids(count = 5) {
  return Array.from({ length: count }, () => crypto.randomUUID()).join("\n");
}

async function runSnippet(id: SnippetId, input: string, secondary: string) {
  switch (id) {
    case "url-encode":
      return encodeUrl(input);
    case "url-decode":
      return decodeUrl(input);
    case "base64-encode":
      return encodeBase64(input);
    case "base64-decode":
      return decodeBase64(input);
    case "html-encode":
      return encodeHtml(input);
    case "html-decode":
      return decodeHtml(input);
    case "json":
      return formatJson(input);
    case "jwt":
      return formatJwt(input);
    case "url-parse":
      return parseUrl(input);
    case "hash":
      return hashAll(input);
    case "timestamp":
      return convertTimestamp(input);
    case "uuid":
      return generateUuids();
    case "diff":
      return formatDiff(input, secondary);
    case "js-endpoints":
      return formatJsEndpoints(input, secondary);
    case "js-endpoint-bookmarklet":
      return jsEndpointBookmarklet();
    case "lorem":
      return generateLorem(3, 3);
    default:
      return "";
  }
}

export function SnippetsWorkspace() {
  const [activeId, setActiveId] = React.useState<SnippetId>("base64-encode");
  const [input, setInput] = React.useState("");
  const [secondary, setSecondary] = React.useState("");
  const [output, setOutput] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [filter, setFilter] = React.useState("");
  const [filterOpen, setFilterOpen] = React.useState(false);

  const active = SNIPPETS.find((snippet) => snippet.id === activeId) ?? SNIPPETS[0];
  const visible = SNIPPETS.filter((snippet) => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return true;
    return `${snippet.name} ${snippet.hint}`.toLowerCase().includes(needle);
  });
  const market = [
    ["JSFuck Encode", "encodes the input and returns a JSFuck payload"],
    ["extract", "No more remembering the flags for tar vs unzip vs gzip"],
    ["clip", "simple bash utility script instead of cat'ing and selecting"],
    ["preview", "bash function which calls jq to output values for key(s)"],
    ["URL-Bypass", "All the ways to bypass a URL (almost)"],
    ["Unicode Escape", "Escape unicode characters"],
    ["Minify JSON", "Compress JSON without changing its meaning"],
    ["Beautify JSON", "Make JSON readable again"],
  ];

  async function execute(nextId = activeId) {
    setError(null);
    setCopied(false);
    try {
      const result = await runSnippet(nextId, input, secondary);
      setOutput(result);
    } catch (caught) {
      setOutput("");
      setError(caught instanceof Error ? caught.message : "Could not run that snippet.");
    }
  }

  function selectSnippet(id: SnippetId) {
    setActiveId(id);
    setError(null);
    setCopied(false);
    const snippet = SNIPPETS.find((item) => item.id === id);
    if (snippet && snippet.needsInput === false) {
      void (async () => {
        try {
          setOutput(await runSnippet(id, input, secondary));
        } catch (caught) {
          setOutput("");
          setError(caught instanceof Error ? caught.message : "Could not run that snippet.");
        }
      })();
    }
  }

  async function copyOutput() {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  function swapIo() {
    setInput(output);
    setOutput(input);
    setError(null);
  }

  return (
    <div aria-label="Snippets section" className="font-mono text-[#e9e3ee]">
      <h1 className="mb-5 text-[25px] tracking-[-.04em] text-[#f0ebf4]">Snippets</h1>

      <section className="border border-[#2a2931] bg-[#0b0b0e]">
        <div className="border-b border-[#2a2931] px-4 py-3 text-[10px] uppercase tracking-[.14em] text-[#b0a8b5]">Input</div>
        {active.dual ? (
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            <textarea aria-label={active.primaryLabel ?? "Input"} value={input} onChange={(event) => setInput(event.target.value)} rows={7} placeholder={active.primaryPlaceholder ?? "Paste or type text here…"} className="w-full resize-y border border-[#2a2931] bg-[#08080b] p-3 text-[11px] leading-5 text-[#ece7f0] outline-none placeholder:text-[#625d69] focus:border-[#71667b]" />
            <textarea aria-label={active.secondaryLabel ?? "Secondary input"} value={secondary} onChange={(event) => setSecondary(event.target.value)} rows={7} placeholder={active.secondaryPlaceholder ?? "Second input…"} className="w-full resize-y border border-[#2a2931] bg-[#08080b] p-3 text-[11px] leading-5 text-[#ece7f0] outline-none placeholder:text-[#625d69] focus:border-[#71667b]" />
          </div>
        ) : active.needsInput !== false ? <textarea id="snippet-input" aria-label="Snippet input" value={input} onChange={(event) => setInput(event.target.value)} rows={9} placeholder="Paste or type text here…" className="w-full resize-y border-0 bg-[#08080b] p-4 text-[11px] leading-5 text-[#ece7f0] outline-none placeholder:text-[#625d69]" /> : <div className="grid min-h-[180px] place-items-center text-[11px] text-[#68616e]">This snippet generates output without input.</div>}
        <div className="flex items-center justify-end gap-3 border-t border-[#2a2931] px-3 py-2"><button type="button" title="Search snippets" aria-label="Search snippets" onClick={() => setFilterOpen(true)} className="text-[#a39ba9] hover:text-white"><Search className="h-4 w-4" /></button><button type="button" title="Filter snippets" aria-label="Filter snippets" onClick={() => setFilterOpen(true)} className="text-[#a39ba9] hover:text-white"><Filter className="h-4 w-4" /></button><button type="button" title="Refresh output" aria-label="Refresh output" onClick={() => void execute()} className="text-[#a39ba9] hover:text-white"><RefreshCw className="h-4 w-4" /></button><button type="button" title="New snippet input" aria-label="New snippet input" onClick={() => { setInput(""); setSecondary(""); setOutput(""); setError(null); }} className="text-[#a39ba9] hover:text-white"><Plus className="h-4 w-4" /></button></div>
      </section>

      {filterOpen ? <div className="mt-3 flex items-center gap-2 border border-[#2a2931] bg-[#0b0b0e] px-3 py-2"><Search className="h-3.5 w-3.5 text-[#8a8390]" /><input id="snippet-filter" autoFocus value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Filter snippets…" className="w-full bg-transparent text-[10px] text-[#eee8f2] outline-none placeholder:text-[#625d69]" /><button type="button" aria-label="Close snippet filter" onClick={() => { setFilter(""); setFilterOpen(false); }} className="text-[#8a8390] hover:text-white">×</button></div> : null}

      <section className="mt-3 border border-[#2a2931] bg-[#0b0b0e]">
        <div className="flex items-center justify-between border-b border-[#2a2931] px-4 py-3 text-[10px] uppercase tracking-[.14em] text-[#b0a8b5]"><span>Snippets · {SNIPPETS.length}</span><span className="text-[#716a76]">{active.name}</span></div>
        <div className="relative min-h-[150px] bg-[#09090c] px-4 py-4"><p className="text-[10px] uppercase tracking-[.14em] text-[#8d8692]">Flow</p><div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-[#7b7482]"><span className="border border-[#36343e] px-3 py-2 text-[#dcd5e1]">{active.name}</span><ChevronRightPlaceholder /><span className="border border-dashed border-[#36343e] px-3 py-2">output</span></div><button type="button" onClick={() => void execute()} className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-[#8d8492] hover:text-[#eee8f2]">+ Add Step</button></div>
        {error ? <p role="alert" className="border-t border-[#2a2931] px-4 py-3 text-[10px] text-rose-300">{error}</p> : null}
        {output ? <div className="border-t border-[#2a2931] p-4"><div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[.12em] text-[#a39ba9]"><span>Output</span><div className="flex items-center gap-2"><button type="button" onClick={swapIo} className="text-[#8e8794] hover:text-white"><ArrowLeftRight className="h-3.5 w-3.5" /></button><button type="button" onClick={() => void copyOutput()} className="text-[#8e8794] hover:text-white">{copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}</button></div></div><pre className="max-h-52 overflow-auto whitespace-pre-wrap break-words border border-[#2a2931] bg-[#08080b] p-3 text-[10px] leading-5 text-[#cbc3d0]">{output}</pre></div> : null}
      </section>

      <SnippetShelf title="My Collection" snippets={visible} activeId={activeId} onSelect={selectSnippet} />
      <div className="mt-8"><SnippetShelf title="Market" snippets={market.map(([name, hint], index) => ({ id: `market-${index}` as SnippetId, name, hint, needsInput: false }))} activeId={null} onSelect={() => undefined} /></div>
    </div>
  );
}

function ChevronRightPlaceholder() {
  return <span className="text-[#837b89]">›</span>;
}

function SnippetShelf({
  title,
  snippets,
  activeId,
  onSelect,
}: {
  title: string;
  snippets: Snippet[];
  activeId: SnippetId | null;
  onSelect: (id: SnippetId) => void;
}) {
  return (
    <section className="mt-7">
      <div className="mb-3 flex items-center gap-3 text-[10px] uppercase tracking-[.14em] text-[#b0a8b5]"><span>{title}</span><span className="h-px flex-1 bg-[#2a2931]" /><span className="text-[#77717d]">⌄</span></div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {snippets.map((snippet) => <button key={snippet.id} type="button" onClick={() => onSelect(snippet.id)} className={cn("relative min-h-[158px] overflow-hidden border bg-[#0d0d11] p-3 text-left transition", activeId === snippet.id ? "border-[#8b6e98] bg-[#17131a]" : "border-[#2a2931] hover:border-[#5a5261]")}><span className="pointer-events-none absolute right-0 top-0 h-6 w-6 bg-[#08080b]" style={{ clipPath: "polygon(0 0, 100% 100%, 100% 0)" }} /><span className="block pr-3 text-[14px] leading-5 text-[#e8e1eb]">{snippet.name}</span><span className="mt-2 block max-h-16 overflow-hidden text-[10px] leading-5 text-[#aaa2af]">{snippet.hint || "—"}</span><span className="absolute bottom-3 right-3 text-[10px] text-[#b6a9bb]">{title === "Market" ? "▣" : ".EXE"}</span></button>)}
      </div>
    </section>
  );
}
