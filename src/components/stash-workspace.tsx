"use client";

import * as React from "react";
import { ChevronRight, Copy, List, Pencil, Plus, Search, Trash2, X } from "lucide-react";

type StashEntry = {
  id: string;
  name: string;
  comment: string;
  method: string;
  path: string;
  status: number;
  client: string;
  createdAt: string;
  headers: Record<string, string>;
  body: string;
};

const STORAGE_KEY = "xe1signal-pinqued-stash-v1";

function parseEntries(raw: string | null): StashEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is StashEntry => {
      if (!item || typeof item !== "object") return false;
      const entry = item as Partial<StashEntry>;
      return (
        typeof entry.id === "string" &&
        typeof entry.name === "string" &&
        typeof entry.comment === "string" &&
        typeof entry.method === "string" &&
        typeof entry.path === "string" &&
        typeof entry.status === "number" &&
        typeof entry.client === "string" &&
        typeof entry.createdAt === "string" &&
        !!entry.headers &&
        typeof entry.headers === "object" &&
        typeof entry.body === "string"
      );
    });
  } catch {
    return [];
  }
}

function ageLabel(createdAt: string) {
  const age = Math.max(0, Date.now() - new Date(createdAt).getTime());
  if (age < 60_000) return `${Math.max(1, Math.floor(age / 1000))}s ago`;
  if (age < 3_600_000) return `${Math.floor(age / 60_000)}m ago`;
  return `${Math.floor(age / 3_600_000)}h ago`;
}

function IconButton({
  label,
  children,
  onClick,
  disabled = false,
}: {
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="grid h-8 w-8 place-items-center text-[#8b8591] transition hover:bg-white/[.04] hover:text-[#eee8f2] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function StashWorkspace() {
  const [entries, setEntries] = React.useState<StashEntry[]>([]);
  const [hydrated, setHydrated] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [showNew, setShowNew] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [name, setName] = React.useState("");
  const [comment, setComment] = React.useState("");
  const [body, setBody] = React.useState("");

  React.useEffect(() => {
    const next = parseEntries(window.localStorage.getItem(STORAGE_KEY));
    setEntries(next);
    setSelectedId(next[0]?.id ?? null);
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries, hydrated]);

  const visible = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return entries;
    return entries.filter((entry) => `${entry.name} ${entry.path} ${entry.comment}`.toLowerCase().includes(needle));
  }, [entries, query]);
  const selected = entries.find((entry) => entry.id === selectedId) ?? visible[0] ?? null;

  function createEntry() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const now = new Date().toISOString();
    const next: StashEntry = {
      id: `stash-${Date.now().toString(36)}`,
      name: trimmed,
      comment: comment.trim(),
      method: "GET",
      path: `/${trimmed.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-|-$/g, "") || "stash"}`,
      status: 200,
      client: "local",
      createdAt: now,
      headers: { "content-type": "text/plain" },
      body: body || "(empty body)",
    };
    setEntries((current) => [next, ...current]);
    setSelectedId(next.id);
    setName("");
    setComment("");
    setBody("");
    setShowNew(false);
  }

  async function copyBody() {
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(selected.body);
    } catch {
      /* ignore clipboard permissions */
    }
  }

  function removeSelected() {
    if (!selected) return;
    const next = entries.filter((entry) => entry.id !== selected.id);
    setEntries(next);
    setSelectedId(next[0]?.id ?? null);
  }

  return (
    <div aria-label="Stash section" className="font-mono text-[#e9e3ee]">
      <div className="mb-5 flex items-end justify-between gap-3">
        <h1 className="text-[25px] tracking-[-.04em] text-[#f0ebf4]">Stash</h1>
        <div className="flex items-center gap-2">
          <label className="flex h-8 items-center gap-2 border border-[#292830] bg-[#101014] px-2.5 text-[#8d8794]">
            <Search className="h-3.5 w-3.5" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" className="w-24 bg-transparent text-[10px] text-[#ece7f0] outline-none placeholder:text-[#615d68]" />
          </label>
          <button type="button" onClick={() => setShowNew((value) => !value)} className="inline-flex h-8 items-center gap-1.5 border border-[#494452] bg-[#1a1920] px-3 text-[10px] text-[#ece7f0] hover:border-[#817990]">
            {showNew ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {showNew ? "Close" : "New Stash"}
          </button>
        </div>
      </div>

      <section className="border border-[#2a2931] bg-[#0d0d11]">
        <div className="grid grid-cols-2 border-b border-[#2a2931] sm:grid-cols-4">
          <div className="border-b border-[#2a2931] px-4 py-3 sm:border-b-0 sm:border-r">
            <p className="text-[9px] uppercase tracking-[.12em] text-[#a39ba9]">Entries</p>
            <p className="mt-1 text-[15px] text-[#f2edf4]">{entries.length}</p>
          </div>
          <div className="border-b border-[#2a2931] px-4 py-3 sm:border-b-0 sm:border-r">
            <p className="text-[9px] uppercase tracking-[.12em] text-[#a39ba9]">Type</p>
            <p className="mt-1 inline-flex items-center gap-1 text-[13px] text-[#f2edf4]">All <ChevronRight className="h-3 w-3 text-[#8e8794]" /></p>
          </div>
          <div className="border-r-0 px-4 py-3 sm:border-r">
            <p className="text-[9px] uppercase tracking-[.12em] text-[#a39ba9]">Sort</p>
            <p className="mt-1 inline-flex items-center gap-1 text-[13px] text-[#f2edf4]">Recent <ChevronRight className="h-3 w-3 text-[#8e8794]" /></p>
          </div>
          <div className="border-t border-[#2a2931] px-4 py-3 sm:border-t-0">
            <p className="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[.12em] text-[#a39ba9]"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Last hit</p>
            <p className="mt-1 text-[13px] text-[#f2edf4]">{selected ? ageLabel(selected.createdAt) : "—"}</p>
          </div>
        </div>

        <div className="flex items-center justify-between border-b border-[#2a2931] px-4 py-2.5 text-[9px] uppercase tracking-[.12em] text-[#a39ba9]">
          <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Recent requests</span>
          <span>Last {visible.length}</span>
        </div>

        <div className="min-h-[154px]">
          {visible.length === 0 ? (
            <div className="grid min-h-[154px] place-items-center px-6 text-center text-[11px] text-[#6f6975]">
              {hydrated ? "No requests yet" : "Loading stash…"}
            </div>
          ) : (
            <div className="divide-y divide-[#232229]">
              {visible.map((entry) => (
                <button key={entry.id} type="button" onClick={() => setSelectedId(entry.id)} className={`grid w-full grid-cols-[58px_minmax(80px,1fr)_minmax(100px,1.6fr)_55px_75px] items-center gap-2 px-4 py-3 text-left text-[10px] transition hover:bg-white/[.025] ${selected?.id === entry.id ? "bg-white/[.035]" : ""}`}>
                  <span className="text-sky-300">{entry.method}</span>
                  <span className="truncate text-[#eee8f2]">{entry.name}</span>
                  <span className="truncate text-[#d6cfdc]">{entry.path}</span>
                  <span className="font-semibold text-emerald-400">{entry.status}</span>
                  <span className="truncate text-[#7f7885]">{entry.client}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button type="button" onClick={() => setShowNew(true)} className="flex h-11 w-full items-center justify-center gap-2 border-t border-[#2a2931] text-[11px] text-[#e6dfea] transition hover:bg-white/[.025]">
          <Plus className="h-3.5 w-3.5" /> New Stash
        </button>
      </section>

      {showNew ? (
        <section className="mt-4 border border-[#4a3d20] bg-[#16151a] p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-[.12em] text-[#f1d6a1]">New stash entry</p>
            <button type="button" onClick={() => setShowNew(false)} aria-label="Close new stash form" className="text-[#8d8794] hover:text-white"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-[10px] text-[#a39ba9]">Filename<input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="my-stash" className="mt-1.5 h-9 w-full border border-[#36343d] bg-[#0c0c10] px-2.5 text-[11px] text-[#eee8f2] outline-none focus:border-[#827689]" /></label>
            <label className="block text-[10px] text-[#a39ba9]">Comment<input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Optional note" className="mt-1.5 h-9 w-full border border-[#36343d] bg-[#0c0c10] px-2.5 text-[11px] text-[#eee8f2] outline-none focus:border-[#827689]" /></label>
          </div>
          <label className="mt-3 block text-[10px] text-[#a39ba9]">Body<textarea value={body} onChange={(event) => setBody(event.target.value)} rows={4} placeholder="Response body" className="mt-1.5 w-full resize-y border border-[#36343d] bg-[#0c0c10] p-2.5 text-[11px] leading-5 text-[#eee8f2] outline-none focus:border-[#827689]" /></label>
          <div className="mt-3 flex justify-end"><button type="button" onClick={createEntry} disabled={!name.trim()} className="h-8 border border-[#716078] bg-[#2a2033] px-4 text-[10px] text-[#f0e4f4] disabled:opacity-40">Create stash</button></div>
        </section>
      ) : null}

      {selected ? (
        <section className="mt-4 border border-[#2a2931] bg-[#0d0d11] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-[#eee8f2]">{selected.name} <span className="text-[#8d8794]">· 1 hits</span></p>
            <div className="flex items-center">
              <IconButton label="Edit stash"><Pencil className="h-3.5 w-3.5" /></IconButton>
              <IconButton label="Access logs"><List className="h-3.5 w-3.5" /></IconButton>
              <IconButton label="Copy response" onClick={() => void copyBody()}><Copy className="h-3.5 w-3.5" /></IconButton>
              <IconButton label="Delete stash" onClick={removeSelected}><Trash2 className="h-3.5 w-3.5" /></IconButton>
            </div>
          </div>
          {selected.comment ? <p className="mt-3 border border-[#2b2a32] bg-[#0a0a0d] px-3 py-2 text-[10px] italic text-[#b1aab7]">{selected.comment}</p> : null}
          <div className="mt-3 border border-[#2b2a32] bg-[#09090c]">
            <p className="border-b border-[#2b2a32] px-3 py-2 text-[9px] uppercase tracking-[.12em] text-[#a39ba9]">Response headers</p>
            <div className="space-y-1 px-3 py-3 text-[10px] text-[#ddd6e2]">{Object.entries(selected.headers).map(([key, value]) => <p key={key}><span className="text-[#9e96a4]">{key}</span><span className="mx-3 text-[#625c68]">:</span>{value}</p>)}</div>
          </div>
          <div className="mt-3 border border-[#2b2a32] bg-[#09090c]">
            <p className="border-b border-[#2b2a32] px-3 py-2 text-[9px] uppercase tracking-[.12em] text-[#a39ba9]">Body</p>
            <pre className="max-h-52 overflow-auto whitespace-pre-wrap break-words px-3 py-3 text-[10px] leading-5 text-[#ddd6e2]">{selected.body}</pre>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-[#2b2a32] pt-3 text-[9px] uppercase tracking-[.12em] text-[#77717e]">
            <span>Access logs</span><span>{selected.method} {selected.path} · {selected.status}</span>
          </div>
        </section>
      ) : null}
    </div>
  );
}
