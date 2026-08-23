"use client";

import * as React from "react";
import {
  CheckCheck,
  Copy,
  Filter,
  ListX,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { usePinqued } from "@/components/pinqued-session";
import { asRecord, asText, pinquedError } from "@/lib/pinqued";

type RequestLog = {
  id: string;
  createdAt: string;
  method: string;
  ipAddress: string;
  requestData: unknown;
  oobSessionId: string | null;
};

type LogListener = {
  id: string;
  type: "legacy" | "interactsh";
  label: string;
  address: string;
  url: string;
  deletable: boolean;
};

function normalizeLog(value: unknown): RequestLog | null {
  const raw = asRecord(value);
  const id = asText(raw.id);
  if (!id) return null;
  return {
    id,
    createdAt: asText(raw.createdAt),
    method: asText(raw.method, "HTTP").toUpperCase(),
    ipAddress: asText(raw.ipAddress, "—"),
    requestData: raw.requestData,
    oobSessionId: asText(raw.oobSessionId) || null,
  };
}

function normalizeListener(value: unknown): LogListener | null {
  const raw = asRecord(value);
  const id = asText(raw.id);
  const type = asText(raw.type);
  if (!id || (type !== "legacy" && type !== "interactsh")) return null;
  return {
    id,
    type,
    label: asText(raw.label, type === "legacy" ? "Legacy" : "Interactsh"),
    address: asText(raw.address),
    url: asText(raw.url),
    deletable: Boolean(raw.deletable),
  };
}

function requestRecord(log: RequestLog) {
  if (typeof log.requestData === "string") {
    try {
      return asRecord(JSON.parse(log.requestData));
    } catch {
      return { rawPacket: log.requestData };
    }
  }
  return asRecord(log.requestData);
}

function logPath(log: RequestLog) {
  const request = requestRecord(log);
  return (
    asText(request.path) ||
    asText(request.requestPath) ||
    asText(request.url) ||
    asText(request.fullUrl) ||
    "/"
  );
}

function protocol(log: RequestLog) {
  const request = requestRecord(log);
  return (
    asText(request.protocol) ||
    asText(request.scheme) ||
    (log.method === "DNS" ? "DNS" : "HTTPS")
  ).toUpperCase();
}

function formattedHeaders(value: unknown) {
  return Object.entries(asRecord(value))
    .map(
      ([name, header]) =>
        `${name}: ${Array.isArray(header) ? header.join(", ") : String(header ?? "")}`,
    )
    .join("\n");
}

function rawPacket(log: RequestLog) {
  const request = requestRecord(log);
  const raw =
    asText(request.rawPacket) ||
    asText(request.raw) ||
    asText(request.packet) ||
    asText(request.request);
  if (raw) return raw;
  const headers = formattedHeaders(request.headers);
  const body =
    typeof request.body === "string"
      ? request.body
      : request.body == null
        ? ""
        : JSON.stringify(request.body, null, 2);
  return [`${log.method} ${logPath(log)} HTTP/1.1`, headers, body]
    .filter(Boolean)
    .join("\n\n");
}

function requestPayload(log: RequestLog) {
  const request = requestRecord(log);
  const query = request.queryParameters ?? request.query ?? request.params;
  const body = request.body;
  if (query == null && body == null) return "No query parameters or body";
  return JSON.stringify(
    { ...(query == null ? {} : { query }), ...(body == null ? {} : { body }) },
    null,
    2,
  );
}

function timeLabel(value: string, full = false) {
  const parsed = new Date(value);
  if (!value || Number.isNaN(parsed.getTime())) return "—";
  if (full) return parsed.toLocaleString();
  return parsed.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function eventData(event: Event) {
  if (!(event instanceof MessageEvent)) return null;
  try {
    return JSON.parse(String(event.data));
  } catch {
    return null;
  }
}

function dataArray(payload: unknown) {
  const data = asRecord(payload).data;
  return Array.isArray(data) ? data : [];
}

export function LogsWorkspace() {
  const pinqued = usePinqued();
  const [logs, setLogs] = React.useState<RequestLog[]>([]);
  const [listeners, setListeners] = React.useState<LogListener[]>([]);
  const [selectedId, setSelectedId] = React.useState("");
  const [sourceFilter, setSourceFilter] = React.useState("all");
  const [showFilter, setShowFilter] = React.useState(false);
  const [showCreate, setShowCreate] = React.useState(false);
  const [listenerLabel, setListenerLabel] = React.useState("");
  const [readIds, setReadIds] = React.useState<Set<string>>(() => new Set());
  const [loading, setLoading] = React.useState(true);
  const [working, setWorking] = React.useState(false);
  const [streamReady, setStreamReady] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const [logsResponse, listenersResponse] = await Promise.all([
      pinqued.request("logs"),
      pinqued.request("logs/listeners"),
    ]);
    const [logsPayload, listenersPayload] = await Promise.all([
      logsResponse.json().catch(() => ({})),
      listenersResponse.json().catch(() => ({})),
    ]);
    if (!logsResponse.ok || !listenersResponse.ok) {
      setError(
        pinquedError(
          !logsResponse.ok ? logsPayload : listenersPayload,
          "Could not load Pinqued logs",
        ),
      );
      setLogs([]);
      setListeners([]);
      setStreamReady(false);
      setLoading(false);
      return;
    }
    const nextLogs = dataArray(logsPayload)
      .map(normalizeLog)
      .filter((item): item is RequestLog => Boolean(item));
    const nextListeners = dataArray(listenersPayload)
      .map(normalizeListener)
      .filter((item): item is LogListener => Boolean(item));
    setLogs(nextLogs);
    setListeners(nextListeners);
    setSelectedId((current) =>
      current && nextLogs.some((item) => item.id === current)
        ? current
        : nextLogs[0]?.id || "",
    );
    setStreamReady(true);
    setLoading(false);
  }, [pinqued]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    if (!streamReady) return;
    const stream = new EventSource("/api/pinqued/proxy/logs/stream");
    const snapshot = (event: Event) => {
      const payload = eventData(event);
      const source = Array.isArray(payload) ? payload : dataArray(payload);
      const next = source
        .map(normalizeLog)
        .filter((item): item is RequestLog => Boolean(item));
      setLogs(next);
      setSelectedId((current) => current || next[0]?.id || "");
    };
    const created = (event: Event) => {
      const payload = eventData(event);
      const item = normalizeLog(asRecord(payload).data ?? payload);
      if (!item) return;
      setLogs((current) => [
        item,
        ...current.filter((entry) => entry.id !== item.id),
      ]);
      setSelectedId((current) => current || item.id);
    };
    const deleted = (event: Event) => {
      const payload = eventData(event);
      const data = asRecord(payload).data ?? payload;
      const record = asRecord(data);
      const ids = Array.isArray(record.ids)
        ? record.ids.map(String)
        : asText(record.id)
          ? [asText(record.id)]
          : [];
      if (!ids.length) return;
      setLogs((current) => current.filter((entry) => !ids.includes(entry.id)));
      setSelectedId((current) => (ids.includes(current) ? "" : current));
    };
    stream.addEventListener("snapshot", snapshot);
    stream.addEventListener("created", created);
    stream.addEventListener("deleted", deleted);
    return () => stream.close();
  }, [streamReady]);

  const listenerFor = React.useCallback(
    (log: RequestLog) => {
      const request = requestRecord(log);
      const sourceId =
        asText(request.listenerId) ||
        asText(request.sourceId) ||
        log.oobSessionId;
      return (
        listeners.find((item) => item.id === sourceId) ||
        listeners.find(
          (item) => item.type === (log.oobSessionId ? "interactsh" : "legacy"),
        )
      );
    },
    [listeners],
  );

  const visibleLogs = logs.filter(
    (log) => sourceFilter === "all" || listenerFor(log)?.id === sourceFilter,
  );
  const selected =
    visibleLogs.find((log) => log.id === selectedId) || visibleLogs[0] || null;

  async function createListener() {
    const label = listenerLabel.trim();
    if (!label) return;
    setWorking(true);
    setError(null);
    const response = await pinqued.request("logs/listeners", {
      method: "POST",
      body: JSON.stringify({ label }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok)
      setError(pinquedError(payload, "Could not create listener"));
    else {
      setListenerLabel("");
      setShowCreate(false);
      await load();
    }
    setWorking(false);
  }

  async function removeListener(id: string) {
    setWorking(true);
    setError(null);
    const response = await pinqued.request(
      `logs/listeners/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
    if (!response.ok)
      setError(
        pinquedError(
          await response.json().catch(() => ({})),
          "Could not remove listener",
        ),
      );
    else await load();
    setWorking(false);
  }

  async function clearLogs() {
    if (!logs.length) return;
    setWorking(true);
    setError(null);
    const response = await pinqued.request("logs", {
      method: "DELETE",
      body: JSON.stringify({ ids: logs.map((log) => log.id) }),
    });
    if (!response.ok)
      setError(
        pinquedError(
          await response.json().catch(() => ({})),
          "Could not clear logs",
        ),
      );
    else {
      setLogs([]);
      setSelectedId("");
    }
    setWorking(false);
  }

  function markRead() {
    setReadIds(new Set(logs.map((log) => log.id)));
  }

  return (
    <div aria-label="Logs section" className="font-mono text-[#e9e3ee]">
      <h1 className="mb-3 text-[25px] tracking-[-.04em] text-[#f0ebf4]">
        Logs
      </h1>
      {error ? (
        <p
          role="alert"
          className="mb-3 border border-amber-400/20 bg-amber-400/[.04] px-3 py-2 text-[10px] leading-5 text-amber-200"
        >
          {error}
        </p>
      ) : null}

      <section className="mb-4 border border-[#2a2931] bg-[#0d0d11] p-4">
        <div className="space-y-2">
          {listeners.map((listener) => (
            <div
              key={listener.id}
              className="flex min-h-12 items-center gap-2 border border-[#302e36] bg-[#09090c] px-4 text-[11px]"
            >
              <span className="text-[#77717e]">//</span>
              <span>{listener.label}</span>
              <span className="text-[#77717e]">::</span>
              <button
                type="button"
                onClick={() =>
                  void navigator.clipboard.writeText(
                    listener.url || listener.address,
                  )
                }
                className="min-w-0 truncate text-left text-[#a8a1ad] hover:text-white"
                title={listener.url || listener.address}
              >
                {listener.address}
              </button>
              <button
                type="button"
                aria-label={`Copy ${listener.label} listener`}
                onClick={() =>
                  void navigator.clipboard.writeText(
                    listener.url || listener.address,
                  )
                }
                className="ml-auto text-[#77717e] hover:text-white"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              {listener.deletable ? (
                <button
                  type="button"
                  aria-label={`Remove ${listener.label} listener`}
                  disabled={working}
                  onClick={() => void removeListener(listener.id)}
                  className="text-[#77717e] hover:text-rose-300"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          ))}
          {showCreate ? (
            <div className="flex min-h-12 items-center gap-2 border border-[#4b4652] bg-[#111015] px-3">
              <input
                autoFocus
                maxLength={24}
                value={listenerLabel}
                onChange={(event) => setListenerLabel(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void createListener();
                }}
                placeholder="Listener label"
                className="h-8 min-w-0 flex-1 bg-transparent px-2 text-[11px] outline-none placeholder:text-[#625d68]"
              />
              <button
                type="button"
                disabled={working || !listenerLabel.trim()}
                onClick={() => void createListener()}
                className="h-8 border border-[#4b4652] px-3 text-[10px] disabled:opacity-40"
              >
                Create
              </button>
              <button
                type="button"
                aria-label="Cancel listener"
                onClick={() => setShowCreate(false)}
              >
                <X className="h-4 w-4 text-[#77717e]" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="flex min-h-12 w-full items-center justify-center border border-[#302e36] bg-[#09090c] text-[#77717e] hover:text-white"
              aria-label="New Interactsh listener"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="my-5 flex items-center gap-3 text-[#5f5a65]">
          <span className="h-px flex-1 border-t border-dashed border-[#302e36]" />
          <span className="grid h-4 w-4 place-items-center rounded-full border border-[#5f5a65] text-[9px]">
            i
          </span>
          <span className="h-px flex-1 border-t border-dashed border-[#302e36]" />
        </div>
        <div className="relative flex items-center justify-between gap-3">
          <span className="text-[9px] uppercase tracking-[.15em] text-[#9d95a4]">
            {sourceFilter === "all"
              ? "All sources"
              : listeners.find((item) => item.id === sourceFilter)?.label ||
                "Source"}{" "}
            · {visibleLogs.length}
          </span>
          <div className="flex items-center gap-4 text-[#77717e]">
            <button
              type="button"
              aria-label="Filter by source"
              onClick={() => setShowFilter((value) => !value)}
            >
              <Filter className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Mark as read"
              disabled={!logs.length}
              onClick={markRead}
            >
              <CheckCheck className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Clear logs"
              disabled={!logs.length || working}
              onClick={() => void clearLogs()}
            >
              <ListX className="h-4 w-4" />
            </button>
          </div>
          {showFilter ? (
            <div className="absolute right-0 top-7 z-20 min-w-44 border border-[#37343d] bg-[#121117] p-1 shadow-2xl">
              <button
                type="button"
                onClick={() => {
                  setSourceFilter("all");
                  setShowFilter(false);
                }}
                className="block w-full px-3 py-2 text-left text-[10px] hover:bg-white/[.05]"
              >
                All sources
              </button>
              {listeners.map((listener) => (
                <button
                  key={listener.id}
                  type="button"
                  onClick={() => {
                    setSourceFilter(listener.id);
                    setShowFilter(false);
                  }}
                  className="block w-full px-3 py-2 text-left text-[10px] hover:bg-white/[.05]"
                >
                  {listener.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid min-h-[470px] border border-[#2a2931] bg-[#09090c] md:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="border-b border-[#2a2931] md:border-b-0 md:border-r">
          {loading ? (
            <div className="grid min-h-64 place-items-center">
              <Loader2 className="h-4 w-4 animate-spin text-[#77717e]" />
            </div>
          ) : visibleLogs.length ? (
            visibleLogs.map((log, index) => {
              const listener = listenerFor(log);
              const active = selected?.id === log.id;
              return (
                <button
                  key={log.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(log.id);
                    setReadIds((current) => new Set(current).add(log.id));
                  }}
                  className={`relative grid w-full grid-cols-[1fr_auto] gap-x-3 border-b border-[#24232a] px-4 py-3 text-left text-[10px] ${active ? "bg-[#1b1a20]" : "hover:bg-white/[.025]"}`}
                >
                  {active ? (
                    <span className="absolute inset-y-0 left-0 w-0.5 bg-sky-400" />
                  ) : null}
                  <span>
                    <span
                      className={
                        readIds.has(log.id) ? "text-[#77717e]" : "text-sky-300"
                      }
                    >
                      #{visibleLogs.length - index}
                    </span>{" "}
                    <span className="text-emerald-400">{protocol(log)}</span>
                  </span>
                  <span className="text-[#77717e]">
                    {timeLabel(log.createdAt)}
                  </span>
                  <span className="mt-2 truncate text-[#d8d0dd]">
                    {listener?.label || "Legacy"}::{logPath(log)}
                  </span>
                  <span className="mt-2 truncate text-[#77717e]">
                    {log.ipAddress}
                  </span>
                </button>
              );
            })
          ) : (
            <div className="grid min-h-64 place-items-center text-[10px] text-[#6f6975]">
              No requests yet
            </div>
          )}
        </aside>

        <div className="min-w-0 p-4">
          {selected ? (
            <>
              <dl className="grid grid-cols-2 gap-3 border-b border-[#2a2931] pb-4 text-[10px] sm:grid-cols-[70px_1fr_auto]">
                <div>
                  <dt className="text-[9px] uppercase tracking-[.13em] text-[#716b77]">
                    ID
                  </dt>
                  <dd className="mt-1 text-[#e9e3ee]">
                    #
                    {Math.max(
                      1,
                      logs.findIndex((item) => item.id === selected.id) + 1,
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-[9px] uppercase tracking-[.13em] text-[#716b77]">
                    Source IP
                  </dt>
                  <dd className="mt-1 break-all text-[#e9e3ee]">
                    {selected.ipAddress}
                  </dd>
                </div>
                <div className="col-span-2 sm:col-span-1 sm:text-right">
                  <dt className="text-[9px] uppercase tracking-[.13em] text-[#716b77]">
                    Time
                  </dt>
                  <dd className="mt-1 text-[#77717e]">
                    {timeLabel(selected.createdAt, true)}
                  </dd>
                </div>
              </dl>
              <pre className="my-4 min-h-11 whitespace-pre-wrap break-words border border-[#2a2931] bg-[#0d0d11] px-3 py-3 text-[#77717e]">
                {requestPayload(selected)}
              </pre>
              <div className="mb-2 flex items-center justify-between text-[9px] uppercase tracking-[.13em] text-[#716b77]">
                <span>Raw packet</span>
                <button
                  type="button"
                  aria-label="Copy raw packet"
                  onClick={() =>
                    void navigator.clipboard.writeText(rawPacket(selected))
                  }
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
              <pre className="max-h-[330px] min-h-[250px] overflow-auto whitespace-pre border border-[#2a2931] bg-black px-3 py-3 text-[#e9e3ee]">
                {rawPacket(selected)}
              </pre>
            </>
          ) : (
            <div className="grid min-h-[420px] place-items-center text-[#6f6975]">
              <div className="text-center">
                <Trash2 className="mx-auto mb-3 h-7 w-7" />
                <p className="text-[10px]">Select a captured request</p>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
