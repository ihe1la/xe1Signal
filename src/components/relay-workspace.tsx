"use client";

import * as React from "react";
import { Check, Copy, Folder, Loader2, Play, Plus, Save, Search, Square, Trash2 } from "lucide-react";
import { usePinqued } from "@/components/pinqued-session";
import { pinquedError } from "@/lib/pinqued";

type Relay = {
  id: string;
  name: string;
  filename: string;
  subdomain: string;
  url: string;
  status: "starting" | "active" | "stopped" | "error";
  runtime: "python" | "php";
  code?: string;
};

const DEFAULT_SOURCE = `import os
from http.server import HTTPServer, BaseHTTPRequestHandler

PORT = int(os.environ.get("PORT", "8000"))

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/plain")
        self.end_headers()
        self.wfile.write(b"Hello from Relay!\\n")

if __name__ == "__main__":
    HTTPServer(("0.0.0.0", PORT), Handler).serve_forever()`;

export function RelayWorkspace() {
  const pinqued = usePinqued();
  const [relays, setRelays] = React.useState<Relay[]>([]);
  const [maxActive, setMaxActive] = React.useState(5);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [name, setName] = React.useState("my-flask-app");
  const [filename, setFilename] = React.useState("app.py");
  const [code, setCode] = React.useState(DEFAULT_SOURCE);
  const [log, setLog] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const selected = relays.find((relay) => relay.id === selectedId) ?? null;

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await pinqued.request("relays");
      const payload = await response.json().catch(() => ({})) as { data?: Relay[]; meta?: { maxActive?: number } };
      if (!response.ok) throw new Error(pinquedError(payload, "Could not load relays"));
      const next = Array.isArray(payload.data) ? payload.data : [];
      setRelays(next);
      setMaxActive(payload.meta?.maxActive ?? 5);
      setSelectedId((current) => current && next.some((relay) => relay.id === current) ? current : next[0]?.id ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load relays");
    } finally {
      setLoading(false);
    }
  }, [pinqued]);

  React.useEffect(() => { void load(); }, [load]);

  React.useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    void Promise.all([
      pinqued.request(`relays/${encodeURIComponent(selectedId)}`),
      pinqued.request(`relays/${encodeURIComponent(selectedId)}/log`),
    ]).then(async ([detailResponse, logResponse]) => {
      if (cancelled) return;
      if (detailResponse.ok) {
        const payload = await detailResponse.json() as { data?: Relay };
        if (payload.data) {
          setName(payload.data.name);
          setFilename(payload.data.filename);
          setCode(payload.data.code || "");
          setRelays((current) => current.map((relay) => relay.id === payload.data?.id ? { ...relay, ...payload.data } : relay));
        }
      }
      if (logResponse.ok) {
        const payload = await logResponse.json() as { data?: { log?: string } };
        setLog(payload.data?.log || "");
      }
    });
    return () => { cancelled = true; };
  }, [pinqued, selectedId]);

  function resetEditor() {
    setSelectedId(null);
    setName("my-flask-app");
    setFilename("app.py");
    setCode(DEFAULT_SOURCE);
    setLog("");
    setError(null);
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const response = await pinqued.request(selectedId ? `relays/${encodeURIComponent(selectedId)}` : "relays", {
        method: selectedId ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), filename: filename.trim(), code }),
      });
      const payload = await response.json().catch(() => ({})) as { data?: Relay };
      if (!response.ok) throw new Error(pinquedError(payload, "Could not save relay"));
      if (payload.data) setSelectedId(payload.data.id);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save relay");
    } finally {
      setBusy(false);
    }
  }

  async function control(action: "start" | "stop") {
    if (!selected) return;
    setBusy(true);
    setError(null);
    const response = await pinqued.request(`relays/${encodeURIComponent(selected.id)}/${action}`, { method: "POST" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) setError(pinquedError(payload, `Could not ${action} relay`));
    await load();
    setBusy(false);
  }

  async function remove() {
    if (!selected) return;
    setBusy(true);
    const response = await pinqued.request(`relays/${encodeURIComponent(selected.id)}`, { method: "DELETE" });
    if (!response.ok) setError(pinquedError(await response.json().catch(() => ({})), "Could not delete relay"));
    resetEditor();
    await load();
    setBusy(false);
  }

  async function copyLink() {
    if (!selected?.url) return;
    await navigator.clipboard.writeText(selected.url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  const activeCount = relays.filter((relay) => relay.status === "active" || relay.status === "starting").length;

  return (
    <div aria-label="Relay section" className="font-mono text-[#e9e3ee]">
      <div className="mb-5 flex items-end justify-between gap-3"><h1 className="text-[25px] tracking-[-.04em] text-[#f0ebf4]">Relay</h1><button type="button" onClick={resetEditor} className="inline-flex h-8 items-center gap-1.5 border border-[#494452] bg-[#1a1920] px-3 text-[10px]"><Plus className="h-3.5 w-3.5" /> New Relay</button></div>
      {error ? <p role="alert" className="mb-3 text-[10px] text-rose-300">{error}</p> : null}
      <section className="border border-[#2a2931] bg-[#0d0d11]">
        <div className="grid grid-cols-2 sm:grid-cols-4"><Stat label="Active" value={String(activeCount)} green /><Stat label="Type" value="All ›" /><Stat label="Sort" value="Running first ›" /><Stat label="Capacity" value={`${activeCount}/${maxActive}`} last /></div>
        <div className="flex items-center justify-between border-t border-[#2a2931] px-4 py-2.5 text-[9px] uppercase tracking-[.12em] text-[#a39ba9]"><span><i className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" /> Recent requests</span><span>{relays.length}</span></div>
        <div className="min-h-[154px]">{loading ? <div className="grid min-h-[154px] place-items-center"><Loader2 className="h-4 w-4 animate-spin text-[#77717e]" /></div> : relays.length ? relays.map((relay) => <button key={relay.id} type="button" onClick={() => setSelectedId(relay.id)} className={`grid w-full grid-cols-[58px_minmax(90px,1fr)_80px_minmax(130px,1fr)] gap-3 border-t border-[#24232a] px-4 py-3 text-left text-[10px] ${selectedId === relay.id ? "bg-white/[.04]" : "hover:bg-white/[.025]"}`}><span className="text-sky-300">{relay.runtime.toUpperCase()}</span><span className="truncate">{relay.name}</span><span className={relay.status === "active" ? "text-emerald-400" : "text-[#8a8390]"}>{relay.status}</span><span className="truncate text-[#8a8390]">{relay.url}</span></button>) : <div className="grid min-h-[154px] place-items-center text-[11px] text-[#6f6975]">No requests yet</div>}</div>
        <button type="button" onClick={resetEditor} className="flex h-11 w-full items-center justify-center gap-2 border-t border-[#2a2931] text-[11px]"><Plus className="h-3.5 w-3.5" /> New Relay</button>
      </section>

      <section className="mt-5 grid min-h-[420px] grid-cols-1 border border-[#2a2931] bg-[#0d0d11] lg:grid-cols-[228px_minmax(0,1fr)]">
        <aside className="border-r border-[#2a2931]"><div className="flex items-center justify-between border-b border-[#2a2931] px-4 py-3"><span className="text-[10px] uppercase tracking-[.12em]">Projects · {relays.length}</span><Search className="h-3.5 w-3.5 text-[#8a8390]" /></div><div className="p-3">{relays.length ? relays.map((relay) => <button key={relay.id} type="button" onClick={() => setSelectedId(relay.id)} className={`mb-1 flex w-full items-center gap-2 px-2 py-2 text-left text-[10px] ${selectedId === relay.id ? "bg-[#211c27] text-white" : "text-[#99919e]"}`}><Folder className="h-3.5 w-3.5" /><span className="truncate">{relay.name}</span></button>) : <p className="py-8 text-center text-[10px] text-[#77717e]">No relays yet</p>}</div></aside>
        <div className="min-w-0"><div className="grid border-b border-[#2a2931] sm:grid-cols-[1fr_1fr_auto]"><Field label="Project name" value={name} onChange={setName} /><Field label="Entry filename" value={filename} onChange={setFilename} /><button type="button" onClick={() => void save()} disabled={busy || !name.trim() || !filename.trim()} className="grid min-h-16 w-12 place-items-center border-l border-[#2a2931] text-[#a39ba9] disabled:opacity-40">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}</button></div><textarea aria-label="Relay source" value={code} onChange={(event) => setCode(event.target.value)} spellCheck={false} wrap="off" className="block min-h-[340px] w-full resize-y overflow-x-auto bg-[#0b0b0e] p-4 font-mono text-[11px] leading-6 text-[#d7d0df] outline-none" /></div>
      </section>

      {selected ? <section className="mt-4 border border-[#2a2931] bg-[#0d0d11]"><div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2a2931] p-3"><a href={selected.url} target="_blank" rel="noopener noreferrer" className="truncate text-[10px] text-sky-300 hover:text-white">{selected.url}</a><div className="flex items-center gap-2"><button type="button" onClick={() => void copyLink()} className="grid h-8 w-8 place-items-center text-[#9d96a2]">{copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}</button><button type="button" onClick={() => void control(selected.status === "active" ? "stop" : "start")} disabled={busy} className="inline-flex h-8 items-center gap-1.5 border border-[#494452] px-3 text-[10px]">{selected.status === "active" ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}{selected.status === "active" ? "Stop" : "Start"}</button><button type="button" onClick={() => void remove()} disabled={busy} className="grid h-8 w-8 place-items-center text-rose-300"><Trash2 className="h-4 w-4" /></button></div></div><pre className="max-h-52 overflow-auto whitespace-pre-wrap p-4 text-[10px] leading-5 text-[#aaa2af]">{log || "No log output"}</pre></section> : null}
    </div>
  );
}

function Stat({ label, value, green, last }: { label: string; value: string; green?: boolean; last?: boolean }) {
  return <div className={`border-b border-[#2a2931] px-4 py-3 sm:border-b-0 ${last ? "" : "sm:border-r"}`}><p className="text-[9px] uppercase tracking-[.12em] text-[#a39ba9]">{label}</p><p className={`mt-1 text-[13px] ${green ? "text-emerald-400" : ""}`}>{value}</p></div>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="min-w-0 border-b border-[#2a2931] px-4 py-2.5 text-[9px] uppercase tracking-[.12em] text-[#a39ba9] sm:border-b-0 sm:border-r">{label}<input value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 block w-full border-b border-[#4a4651] bg-transparent pb-1 text-[12px] normal-case tracking-normal text-[#ece7f0] outline-none" /></label>;
}
