"use client";

import * as React from "react";
import { Pencil, Search, Trash2 } from "lucide-react";
import {
  FINDINGS_STORAGE_KEY,
  createFinding,
  parseFindings,
  searchFindings,
  serializeFindings,
  sortFindingsNewestFirst,
  updateFinding,
  type Finding,
} from "@/lib/findings";
import { cn } from "@/lib/utils";

function formatWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function FindingsWorkspace() {
  const [findings, setFindings] = React.useState<Finding[]>([]);
  const [hydrated, setHydrated] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editBody, setEditBody] = React.useState("");
  const captureRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    setFindings(sortFindingsNewestFirst(parseFindings(window.localStorage.getItem(FINDINGS_STORAGE_KEY))));
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(FINDINGS_STORAGE_KEY, serializeFindings(findings));
  }, [findings, hydrated]);

  const visible = React.useMemo(
    () => searchFindings(sortFindingsNewestFirst(findings), query),
    [findings, query],
  );

  function addFinding() {
    const next = createFinding(draft);
    if (!next) return;
    setFindings((current) => [next, ...current]);
    setDraft("");
    captureRef.current?.focus();
  }

  function onCaptureKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      addFinding();
    }
  }

  function startEdit(finding: Finding) {
    setEditingId(finding.id);
    setEditBody(finding.body);
  }

  function saveEdit() {
    if (!editingId) return;
    const trimmed = editBody.trim();
    if (!trimmed) {
      setFindings((current) => current.filter((item) => item.id !== editingId));
      setEditingId(null);
      setEditBody("");
      return;
    }
    setFindings((current) =>
      current.map((item) => (item.id === editingId ? updateFinding(item, editBody) : item)),
    );
    setEditingId(null);
    setEditBody("");
  }

  function removeFinding(id: string) {
    setFindings((current) => current.filter((item) => item.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setEditBody("");
    }
  }

  return (
    <div className="mx-auto max-w-[820px]">
      <header className="mb-8">
        <p aria-label="Findings section" className="mb-2 font-sans text-[11px] font-medium tracking-[0.14em] text-violet-300/80 uppercase">
          Findings
        </p>
        <h1 className="font-sans text-3xl font-semibold tracking-tight text-zinc-100 sm:text-[34px]">Tools</h1>
        <p className="mt-2 max-w-xl font-sans text-sm leading-6 text-zinc-500">
          Dump messy recon notes fast. Search them later. Saved in this browser on he1l.me.
        </p>
      </header>

      <section className="sticky top-4 z-20 mb-6 rounded-2xl border border-violet-400/20 bg-[#0d0e14]/92 p-3 shadow-[0_18px_50px_rgba(0,0,0,.45)] backdrop-blur-md sm:p-4">
        <label htmlFor="finding-capture" className="sr-only">
          Capture finding
        </label>
        <textarea
          id="finding-capture"
          ref={captureRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onCaptureKeyDown}
          rows={3}
          placeholder="saw a new header on api.target.com #header #auth"
          className="min-h-[88px] w-full resize-none bg-transparent px-1 py-1 font-sans text-[15px] leading-6 text-zinc-100 outline-none placeholder:text-zinc-600"
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-white/[.06] pt-3">
          <p className="font-sans text-[11px] text-zinc-600">
            Enter to save · Shift+Enter for newline · use #tags
          </p>
          <button
            type="button"
            onClick={addFinding}
            disabled={!draft.trim()}
            className="inline-flex h-9 items-center rounded-lg border border-violet-400/35 bg-violet-500/20 px-4 text-xs font-medium text-violet-100 transition hover:border-violet-300/50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save finding
          </button>
        </div>
      </section>

      <div className="mb-4 flex items-center gap-2 rounded-xl border border-white/[.08] bg-white/[.02] px-3 py-2.5">
        <Search className="h-4 w-4 shrink-0 text-zinc-500" />
        <label htmlFor="finding-search" className="sr-only">
          Search findings
        </label>
        <input
          id="finding-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search headers, hosts, #tags…"
          className="w-full bg-transparent font-sans text-sm text-zinc-200 outline-none placeholder:text-zinc-600"
        />
        <span className="shrink-0 font-sans text-[11px] text-zinc-600">
          {visible.length}/{findings.length}
        </span>
      </div>

      {!hydrated ? (
        <p className="py-16 text-center font-sans text-sm text-zinc-600">Loading findings…</p>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/[.08] px-6 py-16 text-center">
          <p className="font-sans text-sm text-zinc-400">
            {findings.length === 0
              ? "Nothing here yet. Drop the first messy note above."
              : "No findings match that search."}
          </p>
        </div>
      ) : (
        <ul className="space-y-3" aria-label="Findings list">
          {visible.map((finding) => {
            const editing = editingId === finding.id;
            return (
              <li
                key={finding.id}
                className={cn(
                  "rounded-2xl border border-white/[.08] bg-white/[.02] p-4 transition",
                  editing && "border-violet-400/30 bg-violet-500/[.05]",
                )}
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <time className="font-sans text-[11px] text-zinc-600" dateTime={finding.createdAt}>
                    {formatWhen(finding.createdAt)}
                  </time>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      aria-label="Edit finding"
                      onClick={() => (editing ? saveEdit() : startEdit(finding))}
                      className="grid h-8 w-8 place-items-center rounded-md text-zinc-500 transition hover:bg-white/[.04] hover:text-zinc-200"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Delete finding"
                      onClick={() => removeFinding(finding.id)}
                      className="grid h-8 w-8 place-items-center rounded-md text-zinc-500 transition hover:bg-white/[.04] hover:text-rose-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {editing ? (
                  <div className="space-y-3">
                    <textarea
                      aria-label="Edit finding body"
                      value={editBody}
                      onChange={(event) => setEditBody(event.target.value)}
                      rows={4}
                      className="w-full resize-y rounded-xl border border-white/[.08] bg-[#0a0b10] px-3 py-2.5 font-sans text-sm leading-6 text-zinc-100 outline-none focus:border-violet-400/30"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(null);
                          setEditBody("");
                        }}
                        className="h-8 rounded-lg px-3 font-sans text-xs text-zinc-500 hover:text-zinc-300"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={saveEdit}
                        className="h-8 rounded-lg border border-violet-400/30 bg-violet-500/15 px-3 font-sans text-xs text-violet-100"
                      >
                        Update
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap font-sans text-[15px] leading-6 text-zinc-200">{finding.body}</p>
                )}

                {finding.tags.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {finding.tags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setQuery(`#${tag}`)}
                        className="rounded-md border border-violet-400/15 bg-violet-500/10 px-2 py-0.5 font-sans text-[11px] text-violet-200/90 transition hover:border-violet-300/30"
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
