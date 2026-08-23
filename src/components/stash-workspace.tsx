"use client";

import * as React from "react";
import { Copy, List, Pencil, Plus, Trash2, X } from "lucide-react";

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
      return typeof entry.id === "string" && typeof entry.name === "string" && typeof entry.comment === "string" && typeof entry.method === "string" && typeof entry.path === "string" && typeof entry.status === "number" && typeof entry.client === "string" && typeof entry.createdAt === "string" && !!entry.headers && typeof entry.headers === "object" && typeof entry.body === "string";
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

function headerText(headers: Record<string, string>) {
  return Object.entries(headers).map(([key, value]) => `${key}: ${value}`).join("\n");
}

function parseHeaders(value: string) {
  const entries = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const split = line.indexOf(":");
    return split === -1 ? null : [line.slice(0, split).trim(), line.slice(split + 1).trim()] as const;
  }).filter((entry): entry is readonly [string, string] => Boolean(entry));
  return Object.fromEntries(entries.length ? entries : [["content-type", "text/plain"]]);
}

function ActionButton({
  label,
  children,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return <button type="button" aria-label={label} title={label} onClick={onClick} className="grid h-8 w-8 place-items-center text-[#8b8591] hover:bg-white/[.04] hover:text-[#eee8f2]">{children}</button>;
}

export function StashWorkspace() {
  const [entries, setEntries] = React.useState<StashEntry[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [editorId, setEditorId] = React.useState<string | null>(null);
  const [draftName, setDraftName] = React.useState("");
  const [draftComment, setDraftComment] = React.useState("");
  const [draftHeaders, setDraftHeaders] = React.useState("content-type: text/plain");
  const [draftBody, setDraftBody] = React.useState("");
  const [logsOpen, setLogsOpen] = React.useState(false);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    const saved = parseEntries(window.localStorage.getItem(STORAGE_KEY));
    setEntries(saved);
    setSelectedId(saved[0]?.id ?? null);
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries, hydrated]);

  const selected = entries.find((entry) => entry.id === selectedId) ?? null;

  function openNew() {
    setEditorId("new");
    setDraftName("");
    setDraftComment("");
    setDraftHeaders("content-type: text/plain");
    setDraftBody("");
    setLogsOpen(false);
  }

  function openEdit(entry: StashEntry) {
    setEditorId(entry.id);
    setDraftName(entry.name);
    setDraftComment(entry.comment);
    setDraftHeaders(headerText(entry.headers));
    setDraftBody(entry.body === "(empty body)" ? "" : entry.body);
    setLogsOpen(false);
  }

  function saveEditor() {
    const name = draftName.trim() || "stash";
    const safeName = name.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-|-$/g, "") || "stash";
    const nextHeaders = parseHeaders(draftHeaders);
    if (editorId === "new") {
      const next: StashEntry = { id: `stash-${Date.now().toString(36)}`, name, comment: draftComment.trim(), method: "GET", path: `/${safeName}`, status: 200, client: "local", createdAt: new Date().toISOString(), headers: nextHeaders, body: draftBody || "(empty body)" };
      setEntries((current) => [next, ...current]);
      setSelectedId(next.id);
    } else if (editorId) {
      setEntries((current) => current.map((entry) => entry.id === editorId ? { ...entry, name, comment: draftComment.trim(), path: `/${safeName}`, headers: nextHeaders, body: draftBody || "(empty body)" } : entry));
      setSelectedId(editorId);
    }
    setEditorId(null);
  }

  function deleteEntry(id: string) {
    const next = entries.filter((entry) => entry.id !== id);
    setEntries(next);
    setSelectedId(next[0]?.id ?? null);
    if (editorId === id) setEditorId(null);
  }

  async function copyBody(entry: StashEntry) {
    try {
      await navigator.clipboard.writeText(entry.body);
    } catch {
      /* ignore clipboard permissions */
    }
  }

  return (
    <div aria-label="Stash section" className="font-mono text-[#e9e3ee]">
      <h1 className="mb-5 text-[25px] tracking-[-.04em] text-[#f0ebf4]">Stash</h1>

      <section className="border border-[#2a2931] bg-[#0d0d11]">
        <div className="grid grid-cols-2 border-b border-[#2a2931] sm:grid-cols-4">
          <div className="border-b border-[#2a2931] px-4 py-3 sm:border-b-0 sm:border-r"><p className="text-[9px] uppercase tracking-[.12em] text-[#a39ba9]">Entries</p><p className="mt-1 text-[15px]">{entries.length}</p></div>
          <div className="border-b border-[#2a2931] px-4 py-3 sm:border-b-0 sm:border-r"><p className="text-[9px] uppercase tracking-[.12em] text-[#a39ba9]">Type</p><p className="mt-1 text-[13px]">All <span className="text-[#8e8794]">›</span></p></div>
          <div className="border-b border-[#2a2931] px-4 py-3 sm:border-b-0 sm:border-r"><p className="text-[9px] uppercase tracking-[.12em] text-[#a39ba9]">Sort</p><p className="mt-1 text-[13px]">Recent <span className="text-[#8e8794]">›</span></p></div>
          <div className="px-4 py-3"><p className="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[.12em] text-[#a39ba9]"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Last hit</p><p className="mt-1 text-[13px]">{selected ? ageLabel(selected.createdAt) : "—"}</p></div>
        </div>
        <div className="flex items-center justify-between border-b border-[#2a2931] px-4 py-2.5 text-[9px] uppercase tracking-[.12em] text-[#a39ba9]"><span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Recent requests</span><span>Last {entries.length}</span></div>
        <div className="min-h-[154px]">{entries.length ? <div className="divide-y divide-[#232229]">{entries.map((entry) => <button key={entry.id} type="button" onClick={() => setSelectedId(entry.id)} className={`grid w-full grid-cols-[58px_minmax(80px,1fr)_minmax(100px,1.6fr)_55px_75px] items-center gap-2 px-4 py-3 text-left text-[10px] hover:bg-white/[.025] ${selectedId === entry.id ? "bg-white/[.035]" : ""}`}><span className="text-sky-300">{entry.method}</span><span className="truncate text-[#eee8f2]">{entry.name}</span><span className="truncate text-[#d6cfdc]">{entry.path}</span><span className="font-semibold text-emerald-400">{entry.status}</span><span className="truncate text-[#7f7885]">{entry.client}</span></button>)}</div> : <div className="grid min-h-[154px] place-items-center text-[11px] text-[#6f6975]">{hydrated ? "No requests yet" : "Loading stash…"}</div>}</div>
        <button type="button" onClick={openNew} className="flex h-11 w-full items-center justify-center gap-2 border-t border-[#2a2931] text-[11px] text-[#e6dfea] hover:bg-white/[.025]"><Plus className="h-3.5 w-3.5" /> New Stash</button>
      </section>

      {editorId ? <section className="mt-4 border border-[#8a5b17] bg-[#17161b] p-4"><div className="flex items-center justify-between gap-3"><p className="text-[11px] text-[#eee8f2]">{draftName || "new"} <span className="text-[#8d8794]">· {editorId === "new" ? 0 : 1} hits</span></p><div className="flex items-center"><ActionButton label="Close editor" onClick={() => setEditorId(null)}><X className="h-3.5 w-3.5" /></ActionButton></div></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="block text-[10px] text-[#b7aeb9]">Filename<input autoFocus value={draftName} onChange={(event) => setDraftName(event.target.value)} placeholder="stash" className="mt-1.5 h-9 w-full border border-[#47404d] bg-[#0b0b0f] px-2.5 text-[11px] text-[#eee8f2] outline-none focus:border-[#a58baa]" /></label><label className="block text-[10px] text-[#b7aeb9]">Comment<input value={draftComment} onChange={(event) => setDraftComment(event.target.value)} placeholder="Optional note (max 255 chars)" maxLength={255} className="mt-1.5 h-9 w-full border border-[#47404d] bg-[#0b0b0f] px-2.5 text-[11px] text-[#eee8f2] outline-none focus:border-[#a58baa]" /></label></div><div className="my-4 border-t border-dashed border-[#3c3740] text-center text-[13px] text-[#8f8794]">ⓘ</div><div className="border border-[#302d35] bg-[#09090c]"><p className="border-b border-[#302d35] px-3 py-2 text-[9px] uppercase tracking-[.12em] text-[#a39ba9]">Response headers</p><textarea aria-label="Response headers" value={draftHeaders} onChange={(event) => setDraftHeaders(event.target.value)} rows={3} className="w-full resize-y bg-transparent px-3 py-2.5 text-[10px] leading-5 text-[#ddd6e2] outline-none" /></div><div className="mt-3 border border-[#302d35] bg-[#09090c]"><p className="border-b border-[#302d35] px-3 py-2 text-[9px] uppercase tracking-[.12em] text-[#a39ba9]">Body</p><textarea aria-label="Stash body" value={draftBody} onChange={(event) => setDraftBody(event.target.value)} rows={8} placeholder="Response body" className="w-full resize-y bg-transparent px-3 py-2.5 text-[10px] leading-5 text-[#ddd6e2] outline-none placeholder:text-[#625d69]" /></div><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setEditorId(null)} className="h-8 px-3 text-[10px] text-[#8d8794] hover:text-white">Cancel</button><button type="button" onClick={saveEditor} disabled={!draftName.trim()} className="h-8 border border-[#776276] bg-[#2a2033] px-4 text-[10px] text-[#f0e4f4] disabled:opacity-40">Save stash</button></div></section> : null}

      {selected && !editorId ? <section className="mt-4 border border-[#2a2931] bg-[#0d0d11] p-4"><div className="flex items-center justify-between gap-3"><p className="text-[11px] text-[#eee8f2]">{selected.name} <span className="text-[#8d8794]">· 1 hits</span></p><div className="flex items-center"><ActionButton label="Edit stash" onClick={() => openEdit(selected)}><Pencil className="h-3.5 w-3.5" /></ActionButton><ActionButton label="Access logs" onClick={() => setLogsOpen((value) => !value)}><List className="h-3.5 w-3.5" /></ActionButton><ActionButton label="Copy response" onClick={() => void copyBody(selected)}><Copy className="h-3.5 w-3.5" /></ActionButton><ActionButton label="Delete stash" onClick={() => deleteEntry(selected.id)}><Trash2 className="h-3.5 w-3.5" /></ActionButton></div></div><div className="mt-3 border border-[#2b2a32] bg-[#0a0a0d] px-3 py-2 text-[10px] italic text-[#b1aab7]">NOTE - {selected.comment || "empty"}</div><div className="mt-3 border border-[#2b2a32] bg-[#09090c]"><p className="border-b border-[#2b2a32] px-3 py-2 text-[9px] uppercase tracking-[.12em] text-[#a39ba9]">Response headers</p><div className="space-y-1 px-3 py-3 text-[10px] text-[#ddd6e2]">{Object.entries(selected.headers).map(([key, value]) => <p key={key}><span className="text-[#9e96a4]">{key}</span><span className="mx-3 text-[#625c68]">:</span>{value}</p>)}</div></div><div className="mt-3 border border-[#2b2a32] bg-[#09090c]"><p className="border-b border-[#2b2a32] px-3 py-2 text-[9px] uppercase tracking-[.12em] text-[#a39ba9]">Body</p><pre className="max-h-52 overflow-auto whitespace-pre-wrap break-words px-3 py-3 text-[10px] leading-5 text-[#ddd6e2]">{selected.body}</pre></div>{logsOpen ? <div className="mt-4"><p className="mb-2 text-[9px] uppercase tracking-[.12em] text-[#a39ba9]">Access logs</p><div className="grid gap-2 border border-[#2b2a32] bg-[#09090c] p-3 text-[10px] text-[#cfc7d4] sm:grid-cols-3"><span>CLIENT · {selected.client}</span><span>{selected.method} {selected.path}</span><span className="text-emerald-400">STATUS · {selected.status}</span></div></div> : null}</section> : null}
    </div>
  );
}
