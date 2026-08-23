"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { usePinqued } from "@/components/pinqued-session";
import { asNumber, asRecord, asText, pinquedError } from "@/lib/pinqued";

type LogHit = {
  id: string;
  source: string;
  method: string;
  path: string;
  status: number;
  client: string;
  at: string;
};

function formatTime(value: string) {
  const parsed = new Date(value).getTime();
  if (!Number.isFinite(parsed)) return value || "—";
  return new Date(parsed).toLocaleString();
}

export function LogsWorkspace() {
  const pinqued = usePinqued();
  const [hits, setHits] = React.useState<LogHit[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const stashResponse = await pinqued.request("stashes");
    const stashPayload = await stashResponse.json().catch(() => ({}));
    if (!stashResponse.ok) {
      setError(pinquedError(stashPayload, "Could not load Pinqued logs"));
      setHits([]);
      setLoading(false);
      return;
    }
    const stashes = Array.isArray((stashPayload as { data?: unknown[] }).data) ? (stashPayload as { data: unknown[] }).data : [];
    const rows: LogHit[] = [];
    await Promise.all(
      stashes.map(async (item) => {
        const stash = asRecord(item);
        const id = asText(stash.id);
        if (!id) return;
        const name = asText(stash.displayName) || asText(stash.name) || id;
        const response = await pinqued.request(`stashes/${encodeURIComponent(id)}/hits?limit=100`);
        if (!response.ok) return;
        const payload = await response.json().catch(() => ({}));
        const list = Array.isArray((payload as { data?: unknown[] }).data) ? (payload as { data: unknown[] }).data : [];
        list.forEach((hit, index) => {
          const record = asRecord(hit);
          rows.push({
            id: asText(record.id) || `${id}-${index}`,
            source: name,
            method: asText(record.method, "GET"),
            path: asText(record.requestUrl) || asText(record.path) || asText(stash.displayPath) || `/a/${id}`,
            status: asNumber(record.statusCode ?? record.status, 200),
            client: asText(record.ipAddress) || asText(record.client_ip) || asText(record.ip) || "—",
            at: asText(record.createdAt) || asText(record.created_at) || asText(record.timestamp),
          });
        });
      }),
    );
    rows.sort((left, right) => new Date(right.at).getTime() - new Date(left.at).getTime());
    setHits(rows);
    setLoading(false);
  }, [pinqued]);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <div aria-label="Logs section" className="font-mono text-[#e9e3ee]">
      <div className="mb-5 flex items-end justify-between gap-3">
        <h1 className="text-[25px] tracking-[-.04em] text-[#f0ebf4]">Logs</h1>
        <button type="button" onClick={() => void load()} className="h-8 border border-[#494452] bg-[#1a1920] px-3 text-[10px]">Refresh</button>
      </div>
      {error ? <p role="alert" className="mb-3 text-[10px] text-rose-300">{error}</p> : null}
      <section className="border border-[#2a2931] bg-[#0d0d11]">
        <div className="flex items-center justify-between border-b border-[#2a2931] px-4 py-2.5 text-[9px] uppercase tracking-[.12em] text-[#a39ba9]">
          <span>Stash access</span>
          <span>{hits.length}</span>
        </div>
        <div className="min-h-[320px]">
          {loading ? (
            <div className="grid min-h-[320px] place-items-center"><Loader2 className="h-4 w-4 animate-spin text-[#77717e]" /></div>
          ) : hits.length ? (
            hits.map((hit) => (
              <div key={hit.id} className="grid grid-cols-[70px_minmax(90px,1fr)_minmax(120px,1.6fr)_50px_minmax(90px,1fr)] gap-2 border-b border-[#24232a] px-4 py-3 text-[10px]">
                <span className="text-sky-300">{hit.method}</span>
                <span className="truncate">{hit.source}</span>
                <span className="truncate text-[#cfc7d4]">{hit.path}</span>
                <span className="text-emerald-400">{hit.status}</span>
                <span className="truncate text-[#7f7885]">{hit.client} · {formatTime(hit.at)}</span>
              </div>
            ))
          ) : (
            <div className="grid min-h-[320px] place-items-center text-[11px] text-[#6f6975]">No requests yet</div>
          )}
        </div>
      </section>
    </div>
  );
}
