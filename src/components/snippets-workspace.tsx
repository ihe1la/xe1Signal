"use client";

import * as React from "react";
import { ArrowLeftRight, Check, Copy, Filter, Loader2, Pencil, Plus, RefreshCw, Search, Star, Trash2, X } from "lucide-react";
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
import { usePinqued } from "@/components/pinqued-session";
import { normalizeSnippet, pinquedError, type PinquedSnippet } from "@/lib/pinqued";
import { runPinquedSnippet } from "@/lib/pinqued-snippet-runtime";

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

type LocalSnippet = {
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

const SNIPPETS: LocalSnippet[] = [
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

async function runLocalSnippet(id: SnippetId, input: string, secondary: string) {
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

type ActiveStep =
  | { source: "local"; snippet: LocalSnippet }
  | { source: "api"; snippet: PinquedSnippet };

export function SnippetsWorkspace() {
  const pinqued = usePinqued();
  const [active, setActive] = React.useState<ActiveStep>({ source: "local", snippet: SNIPPETS[2] });
  const [input, setInput] = React.useState("");
  const [secondary, setSecondary] = React.useState("");
  const [output, setOutput] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [filter, setFilter] = React.useState("");
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [collection, setCollection] = React.useState<PinquedSnippet[]>([]);
  const [marketSnippets, setMarketSnippets] = React.useState<PinquedSnippet[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<PinquedSnippet | null>(null);
  const [draftName, setDraftName] = React.useState("");
  const [draftComment, setDraftComment] = React.useState("");
  const [draftContent, setDraftContent] = React.useState("return input;");
  const [draftExecutable, setDraftExecutable] = React.useState(true);

  const loadApiSnippets = React.useCallback(async () => {
    const [collectionResponse, marketResponse] = await Promise.all([
      pinqued.request("snippets?scope=collection"),
      pinqued.request("snippets?scope=market"),
    ]);
    const collectionPayload = await collectionResponse.json().catch(() => ({}));
    const marketPayload = await marketResponse.json().catch(() => ({}));
    if (!collectionResponse.ok || !marketResponse.ok) {
      setError(pinquedError(collectionPayload, pinquedError(marketPayload, "Could not load Pinqued snippets")));
      return;
    }
    const nextCollection = Array.isArray((collectionPayload as { data?: unknown[] }).data)
      ? (collectionPayload as { data: unknown[] }).data.map(normalizeSnippet).filter((item): item is PinquedSnippet => Boolean(item))
      : [];
    const nextMarket = Array.isArray((marketPayload as { data?: unknown[] }).data)
      ? (marketPayload as { data: unknown[] }).data.map(normalizeSnippet).filter((item): item is PinquedSnippet => Boolean(item))
      : [];
    setCollection(nextCollection);
    setMarketSnippets(nextMarket);
    setError(null);
  }, [pinqued]);

  React.useEffect(() => {
    void loadApiSnippets();
  }, [loadApiSnippets]);

  const visibleLocal = SNIPPETS.filter((snippet) => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return true;
    return `${snippet.name} ${snippet.hint}`.toLowerCase().includes(needle);
  });
  const visibleCollection = collection.filter((snippet) => matchesFilter(snippet, filter));
  const visibleMarket = marketSnippets.filter((snippet) => matchesFilter(snippet, filter));
  const activeName = active.source === "local" ? active.snippet.name : active.snippet.name;
  const needsInput = active.source === "local" ? active.snippet.needsInput !== false : true;
  const dual = active.source === "local" && Boolean(active.snippet.dual);

  async function execute(step: ActiveStep = active) {
    setError(null);
    setCopied(false);
    setBusy(true);
    try {
      if (step.source === "local") {
        setOutput(await runLocalSnippet(step.snippet.id, input, secondary));
        return;
      }
      if (!step.snippet.isExecutable) {
        setOutput(step.snippet.content);
        return;
      }
      setOutput(await runPinquedSnippet(step.snippet.content, input));
    } catch (caught) {
      setOutput("");
      setError(caught instanceof Error ? caught.message : "Could not run that snippet.");
    } finally {
      setBusy(false);
    }
  }

  function selectLocal(id: SnippetId) {
    const snippet = SNIPPETS.find((item) => item.id === id) ?? SNIPPETS[0];
    const next: ActiveStep = { source: "local", snippet };
    setActive(next);
    setError(null);
    setCopied(false);
    if (snippet.needsInput === false) void execute(next);
  }

  async function selectApi(snippet: PinquedSnippet) {
    const next: ActiveStep = { source: "api", snippet };
    setActive(next);
    setError(null);
    setCopied(false);
    if (snippet.isExecutable) await execute(next);
    else setOutput(snippet.content);
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

  async function addMarketSnippet(snippet: PinquedSnippet) {
    const response = await pinqued.request(`snippets/${encodeURIComponent(snippet.id)}/add`, { method: "POST" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(pinquedError(payload, "Could not add snippet"));
      return;
    }
    await loadApiSnippets();
  }

  async function toggleBookmark(snippet: PinquedSnippet) {
    const response = await pinqued.request(`snippets/${encodeURIComponent(snippet.id)}/bookmark`, {
      method: "PATCH",
      body: JSON.stringify({ isBookmarked: !snippet.isBookmarked }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(pinquedError(payload, "Could not update bookmark"));
      return;
    }
    await loadApiSnippets();
  }

  async function deleteSnippet(snippet: PinquedSnippet) {
    const response = await pinqued.request(`snippets/${encodeURIComponent(snippet.id)}`, { method: "DELETE" });
    if (!response.ok && response.status !== 204) {
      const payload = await response.json().catch(() => ({}));
      setError(pinquedError(payload, "Could not delete snippet"));
      return;
    }
    if (active.source === "api" && active.snippet.id === snippet.id) {
      setActive({ source: "local", snippet: SNIPPETS[2] });
      setOutput("");
    }
    await loadApiSnippets();
  }

  function openEditor(snippet?: PinquedSnippet) {
    setEditing(snippet ?? null);
    setDraftName(snippet?.name || "");
    setDraftComment(snippet?.comment || "");
    setDraftContent(snippet?.content || "return input;");
    setDraftExecutable(snippet?.isExecutable ?? true);
    setEditorOpen(true);
  }

  async function saveEditor() {
    if (!draftName.trim() || !draftContent.trim()) return;
    setBusy(true);
    const body = JSON.stringify({
      name: draftName.trim(),
      comment: draftComment.trim(),
      content: draftContent,
      isExecutable: draftExecutable,
    });
    const response = await pinqued.request(editing ? `snippets/${encodeURIComponent(editing.id)}` : "snippets", {
      method: editing ? "PATCH" : "POST",
      body,
    });
    const payload = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setError(pinquedError(payload, "Could not save snippet"));
      return;
    }
    setEditorOpen(false);
    await loadApiSnippets();
    const saved = normalizeSnippet((payload as { data?: unknown }).data);
    if (saved) void selectApi(saved);
  }

  return (
    <div aria-label="Snippets section" className="font-mono text-[#e9e3ee]">
      <div className="mb-5 flex items-end justify-between gap-3">
        <h1 className="text-[25px] tracking-[-.04em] text-[#f0ebf4]">Snippets</h1>
        <button type="button" onClick={() => openEditor()} className="inline-flex h-8 items-center gap-1.5 border border-[#494452] bg-[#1a1920] px-3 text-[10px]">
          <Plus className="h-3.5 w-3.5" /> New snippet
        </button>
      </div>

      <section className="border border-[#2a2931] bg-[#0b0b0e]">
        <div className="border-b border-[#2a2931] px-4 py-3 text-[10px] uppercase tracking-[.14em] text-[#b0a8b5]">Input</div>
        {dual ? (
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            <textarea aria-label={active.source === "local" ? active.snippet.primaryLabel ?? "Input" : "Input"} value={input} onChange={(event) => setInput(event.target.value)} rows={7} placeholder={active.source === "local" ? active.snippet.primaryPlaceholder ?? "Paste or type text here…" : "Paste or type text here…"} className="w-full resize-y border border-[#2a2931] bg-[#08080b] p-3 text-[11px] leading-5 text-[#ece7f0] outline-none placeholder:text-[#625d69] focus:border-[#71667b]" />
            <textarea aria-label={active.source === "local" ? active.snippet.secondaryLabel ?? "Secondary input" : "Secondary input"} value={secondary} onChange={(event) => setSecondary(event.target.value)} rows={7} placeholder={active.source === "local" ? active.snippet.secondaryPlaceholder ?? "Second input…" : "Second input…"} className="w-full resize-y border border-[#2a2931] bg-[#08080b] p-3 text-[11px] leading-5 text-[#ece7f0] outline-none placeholder:text-[#625d69] focus:border-[#71667b]" />
          </div>
        ) : needsInput ? (
          <textarea id="snippet-input" aria-label="Snippet input" value={input} onChange={(event) => setInput(event.target.value)} rows={9} placeholder="Paste or type text here…" className="w-full resize-y border-0 bg-[#08080b] p-4 text-[11px] leading-5 text-[#ece7f0] outline-none placeholder:text-[#625d69]" />
        ) : (
          <div className="grid min-h-[180px] place-items-center text-[11px] text-[#68616e]">This snippet generates output without input.</div>
        )}
        <div className="flex items-center justify-end gap-3 border-t border-[#2a2931] px-3 py-2">
          <button type="button" title="Search snippets" aria-label="Search snippets" onClick={() => setFilterOpen(true)} className="text-[#a39ba9] hover:text-white"><Search className="h-4 w-4" /></button>
          <button type="button" title="Filter snippets" aria-label="Filter snippets" onClick={() => setFilterOpen(true)} className="text-[#a39ba9] hover:text-white"><Filter className="h-4 w-4" /></button>
          <button type="button" title="Run snippet" aria-label="Run snippet" onClick={() => void execute()} className="text-[#a39ba9] hover:text-white">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}</button>
          <button type="button" title="Clear input" aria-label="Clear input" onClick={() => { setInput(""); setSecondary(""); setOutput(""); setError(null); }} className="text-[#a39ba9] hover:text-white"><Plus className="h-4 w-4" /></button>
        </div>
      </section>

      {filterOpen ? (
        <div className="mt-3 flex items-center gap-2 border border-[#2a2931] bg-[#0b0b0e] px-3 py-2">
          <Search className="h-3.5 w-3.5 text-[#8a8390]" />
          <input id="snippet-filter" autoFocus value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Filter snippets…" className="w-full bg-transparent text-[10px] text-[#eee8f2] outline-none placeholder:text-[#625d69]" />
          <button type="button" aria-label="Close snippet filter" onClick={() => { setFilter(""); setFilterOpen(false); }} className="text-[#8a8390] hover:text-white">×</button>
        </div>
      ) : null}

      <section className="mt-3 border border-[#2a2931] bg-[#0b0b0e]">
        <div className="flex items-center justify-between border-b border-[#2a2931] px-4 py-3 text-[10px] uppercase tracking-[.14em] text-[#b0a8b5]">
          <span>Snippets · {collection.length + marketSnippets.length + SNIPPETS.length}</span>
          <span className="text-[#716a76]">{activeName}</span>
        </div>
        <div className="relative min-h-[150px] bg-[#09090c] px-4 py-4">
          <p className="text-[10px] uppercase tracking-[.14em] text-[#8d8692]">Flow</p>
          <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-[#7b7482]">
            <span className="border border-[#36343e] px-3 py-2 text-[#dcd5e1]">{activeName}</span>
            <span className="text-[#837b89]">›</span>
            <span className="border border-dashed border-[#36343e] px-3 py-2">output</span>
          </div>
          <button type="button" onClick={() => void execute()} className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-[#8d8492] hover:text-[#eee8f2]">
            {busy ? "Running…" : "Run step"}
          </button>
        </div>
        {error ? <p role="alert" className="border-t border-[#2a2931] px-4 py-3 text-[10px] text-rose-300">{error}</p> : null}
        {output ? (
          <div className="border-t border-[#2a2931] p-4">
            <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[.12em] text-[#a39ba9]">
              <span>Output</span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={swapIo} className="text-[#8e8794] hover:text-white"><ArrowLeftRight className="h-3.5 w-3.5" /></button>
                <button type="button" onClick={() => void copyOutput()} className="text-[#8e8794] hover:text-white">{copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}</button>
              </div>
            </div>
            <pre className="max-h-52 overflow-auto whitespace-pre-wrap break-words border border-[#2a2931] bg-[#08080b] p-3 text-[10px] leading-5 text-[#cbc3d0]">{output}</pre>
          </div>
        ) : null}
      </section>

      {editorOpen ? (
        <section className="mt-4 border border-[#8a5b17] bg-[#17161b] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-[#eee8f2]">{editing ? `Edit ${editing.name}` : "New snippet"}</p>
            <button type="button" aria-label="Close editor" onClick={() => setEditorOpen(false)} className="grid h-8 w-8 place-items-center text-[#8b8591] hover:text-white"><X className="h-3.5 w-3.5" /></button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block text-[10px] text-[#b7aeb9]">Name<input value={draftName} onChange={(event) => setDraftName(event.target.value)} className="mt-1.5 h-9 w-full border border-[#47404d] bg-[#0b0b0f] px-2.5 text-[11px] text-[#eee8f2] outline-none focus:border-[#a58baa]" /></label>
            <label className="block text-[10px] text-[#b7aeb9]">Comment<input value={draftComment} onChange={(event) => setDraftComment(event.target.value)} maxLength={255} className="mt-1.5 h-9 w-full border border-[#47404d] bg-[#0b0b0f] px-2.5 text-[11px] text-[#eee8f2] outline-none focus:border-[#a58baa]" /></label>
          </div>
          <label className="mt-3 flex items-center gap-2 text-[10px] text-[#b7aeb9]"><input type="checkbox" checked={draftExecutable} onChange={(event) => setDraftExecutable(event.target.checked)} /> Executable JS (`input` in, `return` out)</label>
          <textarea aria-label="Snippet source" value={draftContent} onChange={(event) => setDraftContent(event.target.value)} rows={10} className="mt-3 w-full resize-y border border-[#302d35] bg-[#09090c] px-3 py-2.5 text-[10px] leading-5 text-[#ddd6e2] outline-none" />
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setEditorOpen(false)} className="h-8 px-3 text-[10px] text-[#8d8794] hover:text-white">Cancel</button>
            <button type="button" onClick={() => void saveEditor()} disabled={busy || !draftName.trim() || !draftContent.trim()} className="inline-flex h-8 items-center gap-2 border border-[#776276] bg-[#2a2033] px-4 text-[10px] text-[#f0e4f4] disabled:opacity-40">{busy ? <Loader2 className="h-3 w-3 animate-spin" /> : null}Save snippet</button>
          </div>
        </section>
      ) : null}

      <ApiSnippetShelf
        title="My Collection"
        snippets={visibleCollection}
        activeId={active.source === "api" ? active.snippet.id : null}
        onSelect={(snippet) => void selectApi(snippet)}
        onEdit={openEditor}
        onBookmark={(snippet) => void toggleBookmark(snippet)}
        onDelete={(snippet) => void deleteSnippet(snippet)}
      />
      <div className="mt-8">
        <ApiSnippetShelf
          title="Market"
          snippets={visibleMarket}
          activeId={active.source === "api" ? active.snippet.id : null}
          onSelect={(snippet) => void selectApi(snippet)}
          onAdd={(snippet) => void addMarketSnippet(snippet)}
        />
      </div>
      <div className="mt-8">
        <LocalSnippetShelf snippets={visibleLocal} activeId={active.source === "local" ? active.snippet.id : null} onSelect={selectLocal} />
      </div>
    </div>
  );
}

function matchesFilter(snippet: PinquedSnippet, filter: string) {
  const needle = filter.trim().toLowerCase();
  if (!needle) return true;
  return `${snippet.name} ${snippet.comment} ${snippet.content}`.toLowerCase().includes(needle);
}

function ApiSnippetShelf({
  title,
  snippets,
  activeId,
  onSelect,
  onAdd,
  onEdit,
  onBookmark,
  onDelete,
}: {
  title: string;
  snippets: PinquedSnippet[];
  activeId: string | null;
  onSelect: (snippet: PinquedSnippet) => void;
  onAdd?: (snippet: PinquedSnippet) => void;
  onEdit?: (snippet: PinquedSnippet) => void;
  onBookmark?: (snippet: PinquedSnippet) => void;
  onDelete?: (snippet: PinquedSnippet) => void;
}) {
  return (
    <section className="mt-7">
      <div className="mb-3 flex items-center gap-3 text-[10px] uppercase tracking-[.14em] text-[#b0a8b5]"><span>{title}</span><span className="h-px flex-1 bg-[#2a2931]" /><span className="text-[#77717d]">{snippets.length}</span></div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {snippets.map((snippet) => (
          <div key={snippet.id} className={cn("relative min-h-[158px] overflow-hidden border bg-[#0d0d11] p-3 hover:border-[#5a5261]", activeId === snippet.id ? "border-[#8b6e98] bg-[#17131a]" : "border-[#2a2931]")}>
            <button type="button" onClick={() => onSelect(snippet)} className="block w-full text-left">
              <span className="block pr-8 text-[14px] leading-5 text-[#e8e1eb]">{snippet.name}</span>
              <span className="mt-2 block max-h-16 overflow-hidden text-[10px] leading-5 text-[#aaa2af]">{snippet.comment || snippet.content.slice(0, 90) || "—"}</span>
            </button>
            <div className="absolute bottom-3 left-3 flex items-center gap-2">
              {onAdd && !snippet.inCollection ? <button type="button" onClick={() => onAdd(snippet)} className="text-[9px] text-[#9c8da4] hover:text-white">+ add</button> : null}
              {onEdit ? <button type="button" aria-label={`Edit ${snippet.name}`} onClick={() => onEdit(snippet)} className="text-[#8a8390] hover:text-white"><Pencil className="h-3 w-3" /></button> : null}
              {onDelete ? <button type="button" aria-label={`Delete ${snippet.name}`} onClick={() => onDelete(snippet)} className="text-[#8a8390] hover:text-rose-300"><Trash2 className="h-3 w-3" /></button> : null}
            </div>
            <div className="absolute right-3 top-3 flex items-center gap-2">
              {onBookmark ? (
                <button type="button" aria-label={snippet.isBookmarked ? "Remove bookmark" : "Bookmark snippet"} onClick={() => onBookmark(snippet)} className={snippet.isBookmarked ? "text-amber-300" : "text-[#6f6975] hover:text-amber-200"}>
                  <Star className="h-3.5 w-3.5" fill={snippet.isBookmarked ? "currentColor" : "none"} />
                </button>
              ) : null}
            </div>
            <span className="absolute bottom-3 right-3 text-[10px] text-[#b6a9bb]">{snippet.isExecutable ? ".EXE" : "▣"}</span>
          </div>
        ))}
        {!snippets.length ? <p className="py-8 text-[10px] text-[#77717e]">No snippets</p> : null}
      </div>
    </section>
  );
}

function LocalSnippetShelf({
  snippets,
  activeId,
  onSelect,
}: {
  snippets: LocalSnippet[];
  activeId: SnippetId | null;
  onSelect: (id: SnippetId) => void;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-3 text-[10px] uppercase tracking-[.14em] text-[#b0a8b5]"><span>Built-ins</span><span className="h-px flex-1 bg-[#2a2931]" /><span className="text-[#77717d]">{snippets.length}</span></div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {snippets.map((snippet) => (
          <button key={snippet.id} type="button" onClick={() => onSelect(snippet.id)} className={cn("relative min-h-[158px] overflow-hidden border bg-[#0d0d11] p-3 text-left transition", activeId === snippet.id ? "border-[#8b6e98] bg-[#17131a]" : "border-[#2a2931] hover:border-[#5a5261]")}>
            <span className="pointer-events-none absolute right-0 top-0 h-6 w-6 bg-[#08080b]" style={{ clipPath: "polygon(0 0, 100% 100%, 100% 0)" }} />
            <span className="block pr-3 text-[14px] leading-5 text-[#e8e1eb]">{snippet.name}</span>
            <span className="mt-2 block max-h-16 overflow-hidden text-[10px] leading-5 text-[#aaa2af]">{snippet.hint || "—"}</span>
            <span className="absolute bottom-3 right-3 text-[10px] text-[#b6a9bb]">.EXE</span>
          </button>
        ))}
      </div>
    </section>
  );
}
