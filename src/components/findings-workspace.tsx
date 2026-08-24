"use client";

import * as React from "react";
import { Cloud, CloudOff, Copy, Network, Pencil, Search, StickyNote, Trash2 } from "lucide-react";
import { FindingsMap } from "@/components/findings-map";
import { MessyNoteBody, NoteMarkdownField } from "@/components/messy-note-body";
import {
  FINDINGS_STORAGE_KEY,
  collectFindingTags,
  createFinding,
  extractUrls,
  parseFindings,
  searchFindings,
  serializeFindings,
  sortFindingsNewestFirst,
  updateFinding,
  type Finding,
} from "@/lib/findings";
import { cn } from "@/lib/utils";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";
import { mergeUpdatedItems } from "@/lib/merge-updated-items";

type FindingsView = "notes" | "map";

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
  const [view, setView] = React.useState<FindingsView>("notes");
  const [draft, setDraft] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editBody, setEditBody] = React.useState("");
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [lastAddedId, setLastAddedId] = React.useState<string | null>(null);
  const [syncState, setSyncState] = React.useState<"syncing" | "synced" | "local">("syncing");
  const syncReadyRef = React.useRef(false);
  const captureRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    const existing = parseFindings(window.localStorage.getItem(FINDINGS_STORAGE_KEY));
    const migrated = window.localStorage.getItem("xe1signal-tools-findings-account-sync-v1") === "true";
    // Drop legacy Linktree seed notes if they were previously auto-loaded.
    const cleaned = existing.filter((item) => !item.id.startsWith("seed_lt_"));
    const syncMode = migrated && cleaned.length === 0 ? "pull" : "merge";
    setFindings(sortFindingsNewestFirst(cleaned));
    setHydrated(true);

    let active = true;
    void fetch("/api/tools/notes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scope: "findings", items: cleaned, mode: syncMode }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Notes could not sync");
        const data = (await response.json()) as { items?: unknown[] };
        const accountItems = parseFindings(JSON.stringify(data.items || []));
        if (!active) return;
        window.localStorage.setItem("xe1signal-tools-findings-account-sync-v1", "true");
        syncReadyRef.current = true;
        setFindings((current) =>
          sortFindingsNewestFirst(mergeUpdatedItems(current, accountItems)),
        );
        setSyncState("synced");
      })
      .catch(() => {
        if (!active) return;
        syncReadyRef.current = true;
        setSyncState("local");
      });

    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(FINDINGS_STORAGE_KEY, serializeFindings(findings));
  }, [findings, hydrated]);

  React.useEffect(() => {
    if (!hydrated || !syncReadyRef.current) return;
    const timer = window.setTimeout(() => {
      setSyncState("syncing");
      void fetch("/api/tools/notes", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scope: "findings", items: findings }),
      })
        .then((response) => setSyncState(response.ok ? "synced" : "local"))
        .catch(() => setSyncState("local"));
    }, 450);
    return () => window.clearTimeout(timer);
  }, [findings, hydrated]);

  const tagStats = React.useMemo(() => collectFindingTags(findings), [findings]);
  const visible = React.useMemo(
    () => searchFindings(sortFindingsNewestFirst(findings), query),
    [findings, query],
  );
  const activeTag = query.trim().startsWith("#") ? query.trim().slice(1).toLowerCase() : null;

  function addFinding() {
    const next = createFinding(draft);
    if (!next) return;
    setFindings((current) => [next, ...current]);
    setDraft("");
    setLastAddedId(next.id);
    window.setTimeout(() => {
      setLastAddedId((current) => (current === next.id ? null : current));
    }, 3200);
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

  async function copyFinding(finding: Finding) {
    try {
      if (await copyTextToClipboard(finding.body)) {
      setCopiedId(finding.id);
      window.setTimeout(() => setCopiedId((current) => (current === finding.id ? null : current)), 1400);
      }
    } catch {
      /* ignore */
    }
  }

  return (
    <div aria-label="Findings section" className={cn("mx-auto", view === "map" ? "max-w-[1100px]" : "max-w-[860px]")}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <p className="max-w-xl font-sans text-sm text-zinc-500">
          Fast recon notes with markdown and #tags — search, filter, or map notes onto targets.
        </p>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 font-mono text-[10px]",
              syncState === "local"
                ? "border-amber-400/20 text-amber-200/70"
                : "border-white/[.08] text-zinc-500",
            )}
            title={syncState === "local" ? "Saved in this app only" : "Saved to your account"}
          >
            {syncState === "local" ? <CloudOff className="h-3.5 w-3.5" /> : <Cloud className="h-3.5 w-3.5" />}
            {syncState === "syncing" ? "Syncing" : syncState === "synced" ? "Account" : "Local"}
          </span>
          <div
            role="tablist"
            aria-label="Findings view"
            className="inline-flex rounded-lg border border-white/[.08] bg-white/[.02] p-0.5"
          >
          <button
            type="button"
            role="tab"
            aria-selected={view === "notes"}
            onClick={() => setView("notes")}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-md px-3 font-sans text-[11px] transition",
              view === "notes"
                ? "bg-violet-500/20 text-violet-100"
                : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            <StickyNote className="h-3.5 w-3.5" />
            Notes
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "map"}
            onClick={() => setView("map")}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-md px-3 font-sans text-[11px] transition",
              view === "map"
                ? "bg-violet-500/20 text-violet-100"
                : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            <Network className="h-3.5 w-3.5" />
            Map
          </button>
          </div>
        </div>
      </div>

      <section className="sticky top-4 z-20 mb-5 rounded-2xl border border-violet-400/20 bg-[#0d0e14]/92 p-3 shadow-[0_18px_50px_rgba(0,0,0,.45)] backdrop-blur-md sm:p-4">
        <label htmlFor="finding-capture" className="sr-only">
          Capture finding
        </label>
        <NoteMarkdownField
          id="finding-capture"
          textareaRef={captureRef}
          value={draft}
          onChange={setDraft}
          onKeyDown={onCaptureKeyDown}
          rows={3}
          placeholder={"**header** on `api.target.com`\n- cookie looks HttpOnly\n#auth #header"}
          textareaClassName="min-h-[88px] w-full resize-none bg-transparent px-1 py-1 font-sans text-[15px] leading-6 text-zinc-100 outline-none placeholder:text-zinc-600"
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-white/[.06] pt-3">
          <p className="font-sans text-[11px] text-zinc-600">
            Markdown · Enter to save · Shift+Enter for newline · #tags
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

      {view === "map" ? (
        <>
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-white/[.08] bg-white/[.02] px-3 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-zinc-500" />
            <label htmlFor="finding-map-search" className="sr-only">
              Filter map findings
            </label>
            <input
              id="finding-map-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter map by host, URL, #tag…"
              className="w-full bg-transparent font-sans text-sm text-zinc-200 outline-none placeholder:text-zinc-600"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="shrink-0 font-sans text-[11px] text-zinc-500 hover:text-zinc-300"
              >
                Clear
              </button>
            ) : null}
            <span className="shrink-0 font-sans text-[11px] text-zinc-600">
              {visible.length}/{findings.length}
            </span>
          </div>
          {hydrated ? (
            <FindingsMap
              findings={query.trim() ? visible : findings}
              highlightFindingId={lastAddedId}
              onSelectFinding={() => setView("notes")}
            />
          ) : (
            <p className="py-16 text-center font-sans text-sm text-zinc-600">Loading map…</p>
          )}
        </>
      ) : (
        <>
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-white/[.08] bg-white/[.02] px-3 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-zinc-500" />
            <label htmlFor="finding-search" className="sr-only">
              Search findings
            </label>
            <input
              id="finding-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search hosts, URLs, #tags…"
              className="w-full bg-transparent font-sans text-sm text-zinc-200 outline-none placeholder:text-zinc-600"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="shrink-0 font-sans text-[11px] text-zinc-500 hover:text-zinc-300"
              >
                Clear
              </button>
            ) : null}
            <span className="shrink-0 font-sans text-[11px] text-zinc-600">
              {visible.length}/{findings.length}
            </span>
          </div>

          {tagStats.length > 0 ? (
            <div className="mb-5 flex flex-wrap gap-1.5" aria-label="Finding tags">
              <button
                type="button"
                onClick={() => setQuery("")}
                className={cn(
                  "rounded-md border px-2.5 py-1 font-sans text-[11px] transition",
                  !activeTag
                    ? "border-violet-400/30 bg-violet-500/15 text-violet-100"
                    : "border-white/[.08] bg-white/[.02] text-zinc-500 hover:text-zinc-300",
                )}
              >
                All
              </button>
              {tagStats.map(({ tag, count }) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setQuery(activeTag === tag ? "" : `#${tag}`)}
                  className={cn(
                    "rounded-md border px-2.5 py-1 font-sans text-[11px] transition",
                    activeTag === tag
                      ? "border-violet-400/30 bg-violet-500/15 text-violet-100"
                      : "border-white/[.08] bg-white/[.02] text-zinc-500 hover:border-violet-400/20 hover:text-violet-200",
                  )}
                >
                  #{tag}
                  <span className="ml-1.5 text-zinc-600">{count}</span>
                </button>
              ))}
            </div>
          ) : null}

          {!hydrated ? (
            <p className="py-16 text-center font-sans text-sm text-zinc-600">Loading findings…</p>
          ) : visible.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/[.08] px-6 py-16 text-center">
              <p className="font-sans text-sm text-zinc-400">
                {findings.length === 0
                  ? "Nothing here yet. Drop a note above to start."
                  : "No findings match that search."}
              </p>
            </div>
          ) : (
            <ul className="space-y-3" aria-label="Findings list">
              {visible.map((finding) => {
                const editing = editingId === finding.id;
                const urls = extractUrls(finding.body);
                return (
                  <li
                    key={finding.id}
                    className={cn(
                      "min-w-0 overflow-hidden rounded-2xl border border-white/[.08] bg-white/[.02] p-4 transition",
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
                          aria-label="Copy finding"
                          onClick={() => void copyFinding(finding)}
                          className="grid h-8 w-8 place-items-center rounded-md text-zinc-500 transition hover:bg-white/[.04] hover:text-zinc-200"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
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

                    {copiedId === finding.id ? (
                      <p className="mb-2 font-sans text-[10px] text-emerald-300/80">Copied</p>
                    ) : null}

                    {editing ? (
                      <div className="space-y-3">
                        <NoteMarkdownField
                          ariaLabel="Edit finding body"
                          value={editBody}
                          onChange={setEditBody}
                          rows={4}
                          textareaClassName="w-full resize-y rounded-xl border border-white/[.08] bg-[#0a0b10] px-3 py-2.5 font-sans text-sm leading-6 text-zinc-100 outline-none focus:border-violet-400/30"
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
                      <MessyNoteBody body={finding.body} linkUrls />
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

                    {urls.length > 1 ? (
                      <p className="mt-2 font-sans text-[10px] text-zinc-600">{urls.length} links in this note</p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
