"use client";

import * as React from "react";
import { ArrowLeftRight, Copy, Check } from "lucide-react";
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
  generateLorem,
  hashAll,
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
  | "lorem";

type Snippet = {
  id: SnippetId;
  name: string;
  hint: string;
  dual?: boolean;
  needsInput?: boolean;
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

  const active = SNIPPETS.find((snippet) => snippet.id === activeId) ?? SNIPPETS[0];
  const visible = SNIPPETS.filter((snippet) => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return true;
    return `${snippet.name} ${snippet.hint}`.toLowerCase().includes(needle);
  });

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
    <div aria-label="Snippets section" className="mx-auto max-w-[1200px]">
      <p className="mb-4 font-sans text-sm text-zinc-500">
        Boop-style transforms. Everything runs in your browser.
      </p>

      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-white/[.08] bg-white/[.02]">
          <div className="border-b border-white/[.06] p-3">
            <label htmlFor="snippet-filter" className="sr-only">
              Filter snippets
            </label>
            <input
              id="snippet-filter"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Filter scripts…"
              className="w-full rounded-lg border border-white/[.08] bg-[#0a0b10] px-3 py-2 font-sans text-sm text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-violet-400/30"
            />
          </div>
          <ul className="max-h-[520px] overflow-y-auto p-2" aria-label="Snippet list">
            {visible.map((snippet) => {
              const selected = snippet.id === activeId;
              return (
                <li key={snippet.id}>
                  <button
                    type="button"
                    onClick={() => selectSnippet(snippet.id)}
                    className={cn(
                      "mb-1 w-full rounded-xl px-3 py-2.5 text-left transition",
                      selected
                        ? "bg-violet-500/15 text-zinc-100"
                        : "text-zinc-400 hover:bg-white/[.04] hover:text-zinc-200",
                    )}
                  >
                    <span className="block font-sans text-sm">{snippet.name}</span>
                    <span className="mt-0.5 block font-sans text-[11px] text-zinc-600">{snippet.hint}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <section className="rounded-2xl border border-white/[.08] bg-white/[.02] p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-sans text-lg font-medium text-zinc-100">{active.name}</h2>
              <p className="mt-0.5 font-sans text-xs text-zinc-500">{active.hint}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void execute()}
                className="inline-flex h-9 items-center rounded-lg border border-violet-400/35 bg-violet-500/20 px-4 text-xs font-medium text-violet-100"
              >
                Run
              </button>
              <button
                type="button"
                onClick={swapIo}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/[.1] px-3 text-xs font-medium text-zinc-300"
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
                Swap
              </button>
              <button
                type="button"
                onClick={() => void copyOutput()}
                disabled={!output}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/[.1] px-3 text-xs font-medium text-zinc-300 disabled:opacity-40"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-violet-300" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          {active.dual ? (
            <div className="mb-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="snippet-input" className="mb-1.5 block font-sans text-[11px] text-zinc-500">
                  Before
                </label>
                <textarea
                  id="snippet-input"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  rows={8}
                  placeholder="Before…"
                  className="w-full resize-y rounded-xl border border-white/[.08] bg-[#0a0b10] px-3 py-2.5 font-mono text-[12px] leading-5 text-zinc-200 outline-none focus:border-violet-400/30"
                />
              </div>
              <div>
                <label htmlFor="snippet-secondary" className="mb-1.5 block font-sans text-[11px] text-zinc-500">
                  After
                </label>
                <textarea
                  id="snippet-secondary"
                  value={secondary}
                  onChange={(event) => setSecondary(event.target.value)}
                  rows={8}
                  placeholder="After…"
                  className="w-full resize-y rounded-xl border border-white/[.08] bg-[#0a0b10] px-3 py-2.5 font-mono text-[12px] leading-5 text-zinc-200 outline-none focus:border-violet-400/30"
                />
              </div>
            </div>
          ) : active.needsInput !== false ? (
            <div className="mb-3">
              <label htmlFor="snippet-input" className="mb-1.5 block font-sans text-[11px] text-zinc-500">
                Input
              </label>
              <textarea
                id="snippet-input"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                rows={8}
                placeholder="Paste text…"
                className="w-full resize-y rounded-xl border border-white/[.08] bg-[#0a0b10] px-3 py-2.5 font-mono text-[12px] leading-5 text-zinc-200 outline-none focus:border-violet-400/30"
              />
            </div>
          ) : null}

          {error ? (
            <p role="alert" className="mb-3 font-sans text-xs text-rose-300">
              {error}
            </p>
          ) : null}

          <div>
            <label htmlFor="snippet-output" className="mb-1.5 block font-sans text-[11px] text-zinc-500">
              Output
            </label>
            <textarea
              id="snippet-output"
              readOnly
              value={output}
              rows={10}
              placeholder="Result…"
              className="w-full resize-y rounded-xl border border-white/[.08] bg-[#090a0f] px-3 py-2.5 font-mono text-[12px] leading-5 text-zinc-300 outline-none"
            />
          </div>
        </section>
      </div>
    </div>
  );
}
