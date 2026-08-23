"use client";

import * as React from "react";
import {
  Check,
  Copy,
  List,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { usePinqued } from "@/components/pinqued-session";

type JsonRecord = Record<string, unknown>;
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
  hits: number;
  shareUrl: string;
};

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function number(value: unknown, fallback = 0) {
  return typeof value === "number" ? value : Number(value) || fallback;
}

function object(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function normalizeHeaders(value: unknown): Record<string, string> {
  const source = object(value);
  return Object.fromEntries(
    Object.entries(source).map(([key, entry]) => [key, String(entry)]),
  );
}

function normalizeEntry(value: unknown): StashEntry {
  const raw = object(value);
  const id = text(raw.id);
  const name =
    text(raw.displayName) ||
    text(raw.display_name) ||
    text(raw.filename) ||
    text(raw.name) ||
    "stash";
  const path =
    text(raw.displayPath) ||
    text(raw.display_path) ||
    text(raw.publicPath) ||
    text(raw.path) ||
    `/a/${id}`;
  const explicitUrl =
    text(raw.shareUrl) ||
    text(raw.share_url) ||
    text(raw.public_url) ||
    text(raw.url);
  return {
    id,
    name,
    comment: text(raw.comment),
    method: text(raw.last_method) || text(raw.method) || "GET",
    path,
    status: number(raw.last_status ?? raw.status, 200),
    client:
      text(raw.last_client_ip) ||
      text(raw.client_ip) ||
      text(raw.client) ||
      "—",
    createdAt:
      text(raw.last_hit_at) ||
      text(raw.updated_at) ||
      text(raw.created_at) ||
      new Date().toISOString(),
    headers: normalizeHeaders(
      raw.responseHeaders ?? raw.response_headers ?? raw.headers,
    ),
    body: text(raw.content) || text(raw.raw_content),
    hits: number(raw.hitCount ?? raw.hit_count ?? raw.hits),
    shareUrl: explicitUrl || new URL(path, "https://pinqued.top").toString(),
  };
}

function ageLabel(createdAt: string) {
  const parsed = new Date(createdAt).getTime();
  if (!Number.isFinite(parsed)) return "—";
  const age = Math.max(0, Date.now() - parsed);
  if (age < 60_000) return `${Math.max(1, Math.floor(age / 1000))}s ago`;
  if (age < 3_600_000) return `${Math.floor(age / 60_000)}m ago`;
  if (age < 86_400_000) return `${Math.floor(age / 3_600_000)}h ago`;
  return `${Math.floor(age / 86_400_000)}d ago`;
}

function headerText(headers: Record<string, string>) {
  return Object.entries(headers)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
}

function parseHeaders(value: string) {
  return Object.fromEntries(
    value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const split = line.indexOf(":");
        return split === -1
          ? null
          : ([
              line.slice(0, split).trim(),
              line.slice(split + 1).trim(),
            ] as const);
      })
      .filter((entry): entry is readonly [string, string] => Boolean(entry)),
  );
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
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center text-[#8b8591] hover:bg-white/[.04] hover:text-[#eee8f2]"
    >
      {children}
    </button>
  );
}

export function StashWorkspace() {
  const pinqued = usePinqued();
  const [entries, setEntries] = React.useState<StashEntry[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [editorId, setEditorId] = React.useState<string | null>(null);
  const [draftName, setDraftName] = React.useState("");
  const [draftComment, setDraftComment] = React.useState("");
  const [draftHeaders, setDraftHeaders] = React.useState(
    "Content-Type: text/plain",
  );
  const [draftBody, setDraftBody] = React.useState("");
  const [logsOpen, setLogsOpen] = React.useState(false);
  const [logs, setLogs] = React.useState<JsonRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const selected = entries.find((entry) => entry.id === selectedId) ?? null;

  const loadEntries = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await pinqued.request("stashes");
      const data = (await response.json().catch(() => ({}))) as JsonRecord;
      if (!response.ok)
        throw new Error(text(data.error) || "Could not load Pinqued stash");
      const source = Array.isArray(data.data)
        ? data.data
        : Array.isArray(data.items)
          ? data.items
          : [];
      const next = source.map(normalizeEntry).filter((entry) => entry.id);
      setEntries(next);
      setSelectedId((current) =>
        current && next.some((entry) => entry.id === current)
          ? current
          : (next[0]?.id ?? null),
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not load Pinqued stash",
      );
    } finally {
      setLoading(false);
    }
  }, [pinqued]);

  React.useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  React.useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    void pinqued
      .request(`stashes/${encodeURIComponent(selectedId)}`)
      .then(async (response) => {
        if (!response.ok || cancelled) return;
        const payload = object(await response.json());
        const detail = normalizeEntry(payload.data ?? payload);
        setEntries((current) =>
          current.map((entry) =>
            entry.id === selectedId ? { ...entry, ...detail } : entry,
          ),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [pinqued, selectedId]);

  function openNew() {
    setEditorId("new");
    setDraftName("");
    setDraftComment("");
    setDraftHeaders("Content-Type: text/plain");
    setDraftBody("");
    setLogsOpen(false);
  }

  function openEdit(entry: StashEntry) {
    setEditorId(entry.id);
    setDraftName(entry.name);
    setDraftComment(entry.comment);
    setDraftHeaders(headerText(entry.headers) || "Content-Type: text/plain");
    setDraftBody(entry.body);
    setLogsOpen(false);
  }

  async function saveEditor() {
    if (!draftName.trim()) return;
    setSaving(true);
    setError(null);
    const headers = parseHeaders(draftHeaders);
    const contentTypeKey = Object.keys(headers).find(
      (key) => key.toLowerCase() === "content-type",
    );
    const payload = {
      filename: draftName.trim(),
      comment: draftComment.trim(),
      responseHeaders: headers,
      contentType: contentTypeKey ? headers[contentTypeKey] : "text/plain",
      corsAllowOrigin: "*",
      corsAllowCredentials: false,
      content: draftBody,
    };
    try {
      const response = await pinqued.request(
        editorId === "new"
          ? "stashes"
          : `stashes/${encodeURIComponent(editorId || "")}`,
        {
          method: editorId === "new" ? "POST" : "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = (await response.json().catch(() => ({}))) as JsonRecord;
      if (!response.ok)
        throw new Error(text(data.error) || "Could not save stash");
      setEditorId(null);
      await loadEntries();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not save stash",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteEntry(id: string) {
    setError(null);
    const response = await pinqued.request(
      `stashes/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as JsonRecord;
      setError(text(data.error) || "Could not delete stash");
      return;
    }
    await loadEntries();
  }

  async function toggleLogs() {
    if (!selected) return;
    const nextOpen = !logsOpen;
    setLogsOpen(nextOpen);
    if (!nextOpen) return;
    const response = await pinqued.request(
      `stashes/${encodeURIComponent(selected.id)}/hits?limit=100`,
    );
    if (!response.ok) return;
    const data = (await response.json().catch(() => ({}))) as JsonRecord;
    setLogs(
      Array.isArray(data.data)
        ? data.data.map(object)
        : Array.isArray(data.hits)
          ? data.hits.map(object)
          : [],
    );
  }

  async function copyLink(entry: StashEntry) {
    try {
      await navigator.clipboard.writeText(entry.shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard permission denied */
    }
  }

  return (
    <div aria-label="Stash section" className="font-mono text-[#e9e3ee]">
      <h1 className="mb-5 text-[25px] tracking-[-.04em] text-[#f0ebf4]">
        Stash
      </h1>
      {error ? (
        <p role="alert" className="mb-3 text-[10px] text-rose-300">
          {error}
        </p>
      ) : null}

      <section className="border border-[#2a2931] bg-[#0d0d11]">
        <div className="grid grid-cols-2 border-b border-[#2a2931] sm:grid-cols-4">
          <div className="border-b border-[#2a2931] px-4 py-3 sm:border-b-0 sm:border-r">
            <p className="text-[9px] uppercase tracking-[.12em] text-[#a39ba9]">
              Entries
            </p>
            <p className="mt-1 text-[15px]">{entries.length}</p>
          </div>
          <div className="border-b border-[#2a2931] px-4 py-3 sm:border-b-0 sm:border-r">
            <p className="text-[9px] uppercase tracking-[.12em] text-[#a39ba9]">
              Type
            </p>
            <p className="mt-1 text-[13px]">
              All <span className="text-[#8e8794]">›</span>
            </p>
          </div>
          <div className="border-b border-[#2a2931] px-4 py-3 sm:border-b-0 sm:border-r">
            <p className="text-[9px] uppercase tracking-[.12em] text-[#a39ba9]">
              Sort
            </p>
            <p className="mt-1 text-[13px]">
              Recent <span className="text-[#8e8794]">›</span>
            </p>
          </div>
          <div className="px-4 py-3">
            <p className="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[.12em] text-[#a39ba9]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Last
              hit
            </p>
            <p className="mt-1 text-[13px]">
              {selected ? ageLabel(selected.createdAt) : "—"}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between border-b border-[#2a2931] px-4 py-2.5 text-[9px] uppercase tracking-[.12em] text-[#a39ba9]">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Recent
            requests
          </span>
          <span>Last {entries.length}</span>
        </div>
        <div className="min-h-[154px]">
          {entries.length ? (
            <div className="divide-y divide-[#232229]">
              {entries.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setSelectedId(entry.id)}
                  className={`grid w-full grid-cols-[58px_minmax(80px,1fr)_minmax(100px,1.6fr)_55px_75px] items-center gap-2 px-4 py-3 text-left text-[10px] hover:bg-white/[.025] ${selectedId === entry.id ? "bg-white/[.035]" : ""}`}
                >
                  <span className="text-sky-300">{entry.method}</span>
                  <span className="truncate text-[#eee8f2]">{entry.name}</span>
                  <span className="truncate text-[#d6cfdc]">{entry.path}</span>
                  <span className="font-semibold text-emerald-400">
                    {entry.status}
                  </span>
                  <span className="truncate text-[#7f7885]">
                    {entry.client}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="grid min-h-[154px] place-items-center text-[11px] text-[#6f6975]">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "No requests yet"
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={openNew}
          className="flex h-11 w-full items-center justify-center gap-2 border-t border-[#2a2931] text-[11px] text-[#e6dfea] hover:bg-white/[.025]"
        >
          <Plus className="h-3.5 w-3.5" /> New Stash
        </button>
      </section>

      {editorId ? (
        <section className="mt-4 border border-[#8a5b17] bg-[#17161b] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-[#eee8f2]">
              {draftName || "new"}{" "}
              <span className="text-[#8d8794]">
                · {editorId === "new" ? 0 : selected?.hits || 0} hits
              </span>
            </p>
            <ActionButton
              label="Close editor"
              onClick={() => setEditorId(null)}
            >
              <X className="h-3.5 w-3.5" />
            </ActionButton>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block text-[10px] text-[#b7aeb9]">
              Filename
              <input
                autoFocus
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                placeholder="stash"
                className="mt-1.5 h-9 w-full border border-[#47404d] bg-[#0b0b0f] px-2.5 text-[11px] text-[#eee8f2] outline-none focus:border-[#a58baa]"
              />
            </label>
            <label className="block text-[10px] text-[#b7aeb9]">
              Comment
              <input
                value={draftComment}
                onChange={(event) => setDraftComment(event.target.value)}
                placeholder="Optional note (max 255 chars)"
                maxLength={255}
                className="mt-1.5 h-9 w-full border border-[#47404d] bg-[#0b0b0f] px-2.5 text-[11px] text-[#eee8f2] outline-none focus:border-[#a58baa]"
              />
            </label>
          </div>
          <div className="my-4 border-t border-dashed border-[#3c3740] text-center text-[13px] text-[#8f8794]">
            ⓘ
          </div>
          <div className="border border-[#302d35] bg-[#09090c]">
            <p className="border-b border-[#302d35] px-3 py-2 text-[9px] uppercase tracking-[.12em] text-[#a39ba9]">
              Response headers
            </p>
            <textarea
              aria-label="Response headers"
              value={draftHeaders}
              onChange={(event) => setDraftHeaders(event.target.value)}
              rows={3}
              className="w-full resize-y bg-transparent px-3 py-2.5 text-[10px] leading-5 text-[#ddd6e2] outline-none"
            />
          </div>
          <div className="mt-3 border border-[#302d35] bg-[#09090c]">
            <p className="border-b border-[#302d35] px-3 py-2 text-[9px] uppercase tracking-[.12em] text-[#a39ba9]">
              Body
            </p>
            <textarea
              aria-label="Stash body"
              value={draftBody}
              onChange={(event) => setDraftBody(event.target.value)}
              rows={8}
              placeholder="Response body"
              className="w-full resize-y bg-transparent px-3 py-2.5 text-[10px] leading-5 text-[#ddd6e2] outline-none placeholder:text-[#625d69]"
            />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditorId(null)}
              className="h-8 px-3 text-[10px] text-[#8d8794] hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void saveEditor()}
              disabled={saving || !draftName.trim()}
              className="inline-flex h-8 items-center gap-2 border border-[#776276] bg-[#2a2033] px-4 text-[10px] text-[#f0e4f4] disabled:opacity-40"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}Save
              stash
            </button>
          </div>
        </section>
      ) : null}

      {selected && !editorId ? (
        <section className="mt-4 border border-[#2a2931] bg-[#0d0d11] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-[#eee8f2]">
              {selected.name}{" "}
              <span className="text-[#8d8794]">· {selected.hits} hits</span>
            </p>
            <div className="flex items-center">
              <ActionButton
                label="Edit stash"
                onClick={() => openEdit(selected)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </ActionButton>
              <ActionButton
                label="Access logs"
                onClick={() => void toggleLogs()}
              >
                <List className="h-3.5 w-3.5" />
              </ActionButton>
              <ActionButton
                label="Copy stash link"
                onClick={() => void copyLink(selected)}
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-300" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </ActionButton>
              <ActionButton
                label="Delete stash"
                onClick={() => void deleteEntry(selected.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </ActionButton>
            </div>
          </div>
          <div className="mt-3 border border-[#2b2a32] bg-[#0a0a0d] px-3 py-2 text-[10px] italic text-[#b1aab7]">
            NOTE - {selected.comment || "empty"}
          </div>
          {logsOpen ? (
            <>
              <div className="mt-3 border border-[#2b2a32] bg-[#09090c]">
                <p className="border-b border-[#2b2a32] px-3 py-2 text-[9px] uppercase tracking-[.12em] text-[#a39ba9]">
                  Response headers
                </p>
                <div className="space-y-1 px-3 py-3 text-[10px] text-[#ddd6e2]">
                  {Object.entries(selected.headers).map(([key, value]) => (
                    <p key={key}>
                      <span className="text-[#9e96a4]">{key}</span>
                      <span className="mx-3 text-[#625c68]">:</span>
                      {value}
                    </p>
                  ))}
                </div>
              </div>
              <div className="mt-3 border border-[#2b2a32] bg-[#09090c]">
                <p className="border-b border-[#2b2a32] px-3 py-2 text-[9px] uppercase tracking-[.12em] text-[#a39ba9]">
                  Body
                </p>
                <pre className="max-h-52 overflow-auto whitespace-pre-wrap break-words px-3 py-3 text-[10px] leading-5 text-[#ddd6e2]">
                  {selected.body || "(empty body)"}
                </pre>
              </div>
              <div className="mt-4">
                <p className="mb-2 text-[9px] uppercase tracking-[.12em] text-[#a39ba9]">
                  Access logs
                </p>
                <div className="border border-[#2b2a32] bg-[#09090c]">
                  {logs.length ? (
                    logs.map((hit, index) => (
                      <div
                        key={text(hit.id) || index}
                        className="grid gap-2 border-b border-[#242229] p-3 text-[10px] text-[#cfc7d4] sm:grid-cols-3"
                      >
                        <span>
                          CLIENT · {text(hit.ipAddress) || text(hit.client_ip) || text(hit.ip) || "—"}
                        </span>
                        <span>
                          {text(hit.method, "GET")}{" "}
                          {text(hit.requestUrl) || text(hit.path, selected.path)}
                        </span>
                        <span className="text-emerald-400">
                          STATUS · {number(hit.statusCode ?? hit.status, 200)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="p-3 text-[10px] text-[#77717e]">
                      No access logs
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
