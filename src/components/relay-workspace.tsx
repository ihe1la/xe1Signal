"use client";

import * as React from "react";
import { Check, Clipboard, Loader2, Play } from "lucide-react";

type RelayResult = {
  status: number;
  contentType: string;
  body: string;
  url: string;
};

export function RelayWorkspace() {
  const [url, setUrl] = React.useState("");
  const [result, setResult] = React.useState<RelayResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  async function relay() {
    const value = url.trim();
    if (!value) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setCopied(false);
    try {
      const response = await fetch("/api/tools/relay", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: value }),
      });
      const data = (await response.json()) as Partial<RelayResult> & { error?: string };
      if (!response.ok) throw new Error(data.error || "The request could not be relayed.");
      setResult({
        status: data.status ?? response.status,
        contentType: data.contentType || "unknown",
        body: data.body || "",
        url: data.url || value,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The request could not be relayed.");
    } finally {
      setLoading(false);
    }
  }

  async function copyOutput() {
    if (!result) return;
    await navigator.clipboard.writeText(result.body);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div aria-label="Relay section" className="mx-auto max-w-[1000px]">
      <div className="mb-5">
        <h2 className="font-sans text-xl font-medium text-zinc-100">Relay</h2>
        <p className="mt-1 max-w-2xl font-sans text-sm leading-6 text-zinc-500">
          Fetch a public URL through xe1Signal and inspect the response without leaving the workspace.
        </p>
      </div>

      <section className="rounded-2xl border border-white/[.08] bg-white/[.02] p-4 sm:p-5">
        <label htmlFor="relay-url" className="mb-2 block font-sans text-[11px] text-zinc-500">
          Target URL
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="relay-url"
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void relay();
            }}
            placeholder="https://example.com"
            className="h-10 min-w-0 flex-1 rounded-lg border border-white/[.08] bg-[#0a0b10] px-3 font-mono text-xs text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-violet-400/30"
          />
          <button
            type="button"
            onClick={() => void relay()}
            disabled={loading || !url.trim()}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-violet-400/35 bg-violet-500/20 px-4 font-sans text-xs text-violet-100 transition hover:border-violet-300/50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            Relay request
          </button>
        </div>
        <p className="mt-3 font-sans text-[11px] leading-5 text-zinc-600">
          Public HTTP(S) URLs only. Private-network targets are blocked and responses are capped at 200 KB.
        </p>
      </section>

      {error ? (
        <p className="mt-4 font-sans text-xs text-rose-300" role="alert">
          {error}
        </p>
      ) : null}

      {result ? (
        <section className="mt-4 overflow-hidden rounded-2xl border border-white/[.08] bg-[#0a0b10]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[.06] px-4 py-3">
            <div className="min-w-0 font-mono text-[10px] text-zinc-500">
              <span className={result.status >= 400 ? "text-rose-300" : "text-emerald-300"}>{result.status}</span>
              <span className="mx-2 text-zinc-700">·</span>
              <span>{result.contentType}</span>
              <p className="mt-1 truncate text-zinc-600">{result.url}</p>
            </div>
            <button
              type="button"
              onClick={() => void copyOutput()}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/[.08] px-2.5 font-sans text-[11px] text-zinc-400 transition hover:text-zinc-200"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Clipboard className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-[11px] leading-5 text-zinc-400">
            {result.body || "(empty response)"}
          </pre>
        </section>
      ) : null}
    </div>
  );
}
