"use client";

import * as React from "react";
import { Check, ChevronRight, Clipboard, Code2, Folder, Loader2, Play, Plus, Search, Save, Trash2 } from "lucide-react";

type RelayResult = { status: number; contentType: string; body: string; url: string };
type RelayProject = { id: string; name: string; filename: string; source: string };

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

const STORAGE_KEY = "xe1signal-pinqued-relay-v1";

function parseProjects(raw: string | null): RelayProject[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is RelayProject => {
      if (!item || typeof item !== "object") return false;
      const project = item as Partial<RelayProject>;
      return typeof project.id === "string" && typeof project.name === "string" && typeof project.filename === "string" && typeof project.source === "string";
    });
  } catch {
    return [];
  }
}

export function RelayWorkspace() {
  const [url, setUrl] = React.useState("");
  const [result, setResult] = React.useState<RelayResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [projects, setProjects] = React.useState<RelayProject[]>([]);
  const [projectName, setProjectName] = React.useState("my-flask-app");
  const [filename, setFilename] = React.useState("app.py");
  const [source, setSource] = React.useState(DEFAULT_SOURCE);
  const [activeProjectId, setActiveProjectId] = React.useState<string | null>(null);
  const [hydrated, setHydrated] = React.useState(false);
  const [publicRequestOpen, setPublicRequestOpen] = React.useState(false);

  React.useEffect(() => {
    const saved = parseProjects(window.localStorage.getItem(STORAGE_KEY));
    setProjects(saved);
    if (saved[0]) {
      setActiveProjectId(saved[0].id);
      setProjectName(saved[0].name);
      setFilename(saved[0].filename);
      setSource(saved[0].source);
    }
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }, [hydrated, projects]);

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
      setResult({ status: data.status ?? response.status, contentType: data.contentType || "unknown", body: data.body || "", url: data.url || value });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The request could not be relayed.");
    } finally {
      setLoading(false);
    }
  }

  async function copyOutput() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.body);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore clipboard permissions */
    }
  }

  function saveProject() {
    const name = projectName.trim() || "my-flask-app";
    const entryFilename = filename.trim() || "app.py";
    if (activeProjectId) {
      setProjects((current) => current.map((project) => project.id === activeProjectId ? { ...project, name, filename: entryFilename, source } : project));
      return;
    }
    const project: RelayProject = { id: `relay-${Date.now().toString(36)}`, name, filename: entryFilename, source };
    setProjects((current) => [...current, project]);
    setActiveProjectId(project.id);
  }

  function selectProject(project: RelayProject) {
    setActiveProjectId(project.id);
    setProjectName(project.name);
    setFilename(project.filename);
    setSource(project.source);
  }

  function newRelay() {
    const baseName = projects.some((project) => project.name === "my-flask-app") ? `my-flask-app-${projects.length + 1}` : "my-flask-app";
    const project: RelayProject = { id: `relay-${Date.now().toString(36)}`, name: baseName, filename: "app.py", source: DEFAULT_SOURCE };
    setProjects((current) => [...current, project]);
    setActiveProjectId(project.id);
    setProjectName(baseName);
    setFilename("app.py");
    setSource(DEFAULT_SOURCE);
    setResult(null);
    setError(null);
  }

  function deleteProject(id: string) {
    const next = projects.filter((project) => project.id !== id);
    setProjects(next);
    if (activeProjectId !== id) return;
    const replacement = next[0];
    setActiveProjectId(replacement?.id ?? null);
    setProjectName(replacement?.name ?? "my-flask-app");
    setFilename(replacement?.filename ?? "app.py");
    setSource(replacement?.source ?? DEFAULT_SOURCE);
  }

  return (
    <div aria-label="Relay section" className="font-mono text-[#e9e3ee]">
      <div className="mb-5 flex items-end justify-between gap-3">
        <h1 className="text-[25px] tracking-[-.04em] text-[#f0ebf4]">Relay</h1>
        <button type="button" onClick={newRelay} className="inline-flex h-8 items-center gap-1.5 border border-[#494452] bg-[#1a1920] px-3 text-[10px] text-[#ece6f0] hover:border-[#817990]"><Plus className="h-3.5 w-3.5" /> New Relay</button>
      </div>
      <section className="border border-[#2a2931] bg-[#0d0d11]">
        <div className="grid grid-cols-2 sm:grid-cols-4">
          <div className="border-b border-[#2a2931] px-4 py-3 sm:border-b-0 sm:border-r"><p className="text-[9px] uppercase tracking-[.12em] text-[#a39ba9]">Active</p><p className="mt-1 text-[15px] text-emerald-400">{projects.length}</p></div>
          <div className="border-b border-[#2a2931] px-4 py-3 sm:border-b-0 sm:border-r"><p className="text-[9px] uppercase tracking-[.12em] text-[#a39ba9]">Type</p><p className="mt-1 inline-flex items-center gap-1 text-[13px]">All <ChevronRight className="h-3 w-3 text-[#8e8794]" /></p></div>
          <div className="border-b border-[#2a2931] px-4 py-3 sm:border-b-0 sm:border-r"><p className="text-[9px] uppercase tracking-[.12em] text-[#a39ba9]">Sort</p><p className="mt-1 inline-flex items-center gap-1 text-[13px]">Running first <ChevronRight className="h-3 w-3 text-[#8e8794]" /></p></div>
          <div className="px-4 py-3"><p className="text-[9px] uppercase tracking-[.12em] text-[#a39ba9]">Capacity</p><p className="mt-1 text-[13px]">{projects.length}/5</p></div>
        </div>
        <div className="flex items-center justify-between border-t border-[#2a2931] px-4 py-2.5 text-[9px] uppercase tracking-[.12em] text-[#a39ba9]"><span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Recent requests</span><span>{result ? "1" : "0"}</span></div>
        <div className="min-h-[154px]">
          {result ? <button type="button" onClick={() => void copyOutput()} className="grid w-full grid-cols-[58px_minmax(100px,1fr)_70px_minmax(100px,1fr)] gap-3 px-4 py-3 text-left text-[10px] hover:bg-white/[.025]"><span className="text-sky-300">GET</span><span className="truncate text-[#e9e3ee]">relay</span><span className={result.status >= 400 ? "text-rose-300" : "text-emerald-400"}>{result.status}</span><span className="truncate text-[#8a8390]">{result.url}</span></button> : <div className="grid min-h-[154px] place-items-center text-[11px] text-[#6f6975]"><div className="text-center"><div className="mx-auto mb-3 grid h-8 w-8 place-items-center border border-[#514c58] text-[#8b8492]">⌁</div><p>No requests yet</p></div></div>}
        </div>
        <button type="button" onClick={newRelay} className="flex h-11 w-full items-center justify-center gap-2 border-t border-[#2a2931] text-[11px] text-[#e6dfea] hover:bg-white/[.025]"><Plus className="h-3.5 w-3.5" /> New Relay</button>
      </section>

      <section className="mt-5 grid min-h-[420px] grid-cols-1 border border-[#2a2931] bg-[#0d0d11] lg:grid-cols-[228px_minmax(0,1fr)]">
        <aside className="border-r border-[#2a2931]">
          <div className="flex items-center justify-between border-b border-[#2a2931] px-4 py-3"><span className="text-[10px] uppercase tracking-[.12em]">Projects · {projects.length}</span><Search className="h-3.5 w-3.5 text-[#8a8390]" /></div>
          <div className="p-3">
            {projects.length === 0 ? <p className="py-8 text-center text-[10px] text-[#77717e]">No relays yet</p> : <div className="space-y-1">{projects.map((project) => <div key={project.id} className={`flex items-center gap-1 ${project.id === activeProjectId ? "bg-[#211c27]" : "hover:bg-white/[.03]"}`}><button type="button" onClick={() => selectProject(project)} className={`flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-left text-[10px] ${project.id === activeProjectId ? "text-[#f0e7f3]" : "text-[#99919e]"}`}><Folder className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{project.name}</span></button><button type="button" aria-label={`Delete ${project.name}`} title="Delete relay" onClick={() => deleteProject(project.id)} className="mr-1 grid h-7 w-7 place-items-center text-[#77717e] hover:text-rose-300"><Trash2 className="h-3.5 w-3.5" /></button></div>)}</div>}
          </div>
        </aside>
        <div className="min-w-0 overflow-hidden"><div className="grid border-b border-[#2a2931] sm:grid-cols-[minmax(160px,1fr)_minmax(130px,1fr)_42px]"><label className="min-w-0 border-b border-[#2a2931] px-4 py-2.5 text-[9px] uppercase tracking-[.12em] text-[#a39ba9] sm:border-b-0 sm:border-r">Project name<input value={projectName} onChange={(event) => setProjectName(event.target.value)} className="mt-1 block min-w-0 w-full border-b border-[#4a4651] bg-transparent pb-1 text-[12px] normal-case tracking-normal text-[#ece7f0] outline-none focus:border-[#aba1b0]" /></label><label className="min-w-0 border-b border-[#2a2931] px-4 py-2.5 text-[9px] uppercase tracking-[.12em] text-[#a39ba9] sm:border-b-0 sm:border-r">Entry filename<input value={filename} onChange={(event) => setFilename(event.target.value)} className="mt-1 block min-w-0 w-full border-b border-[#4a4651] bg-transparent pb-1 text-[12px] normal-case tracking-normal text-[#ece7f0] outline-none focus:border-[#aba1b0]" /></label><button type="button" aria-label="Save relay project" title="Save relay project" onClick={saveProject} className="grid h-full min-h-16 place-items-center text-[#a39ba9] hover:bg-white/[.035] hover:text-white"><Save className="h-4 w-4" /></button></div><div className="relative min-h-[340px] min-w-0 overflow-hidden bg-[#0b0b0e]"><div className="absolute left-0 top-0 w-12 select-none border-r border-[#1e1d23] py-3 text-right text-[10px] leading-6 text-[#68616e]">{source.split("\n").map((_, index) => <div key={index}>{index + 1}</div>)}</div><textarea aria-label="Relay source" value={source} onChange={(event) => setSource(event.target.value)} spellCheck={false} wrap="off" className="block min-h-[340px] min-w-0 max-w-full w-full resize-y overflow-x-auto bg-transparent py-3 pl-16 pr-4 font-mono text-[11px] leading-6 text-[#d7d0df] outline-none" /><div className="pointer-events-none absolute right-3 top-3 text-[#8e8794]"><Code2 className="h-4 w-4" /></div></div></div>
      </section>

      <section className="mt-5 border border-[#2a2931] bg-[#0d0d11]"><button type="button" onClick={() => setPublicRequestOpen((value) => !value)} className="flex h-11 w-full items-center gap-2 px-4 text-left text-[10px] uppercase tracking-[.12em] text-[#a39ba9] hover:bg-white/[.025]"><ChevronRight className={`h-3.5 w-3.5 transition-transform ${publicRequestOpen ? "rotate-90" : ""}`} /> Public request</button>{publicRequestOpen ? <div className="border-t border-[#2a2931] p-4"><div className="flex flex-col gap-2 sm:flex-row"><input aria-label="Relay URL" value={url} onChange={(event) => setUrl(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void relay(); }} placeholder="https://example.com" className="h-9 min-w-0 flex-1 border border-[#36343d] bg-[#09090c] px-3 text-[11px] text-[#eee8f2] outline-none placeholder:text-[#625d69] focus:border-[#827689]" /><button type="button" onClick={() => void relay()} disabled={loading || !url.trim()} className="inline-flex h-9 items-center justify-center gap-2 border border-[#716078] bg-[#2a2033] px-4 text-[10px] text-[#f0e4f4] disabled:opacity-40">{loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />} Relay request</button></div>{error ? <p role="alert" className="mt-3 text-[10px] text-rose-300">{error}</p> : null}</div> : null}</section>

      {result ? <section className="mt-4 border border-[#2a2931] bg-[#0b0b0e]"><div className="flex items-center justify-between border-b border-[#2a2931] px-4 py-3 text-[10px] text-[#8f8895]"><span><b className={result.status >= 400 ? "text-rose-300" : "text-emerald-400"}>{result.status}</b> · {result.contentType}</span><button type="button" onClick={() => void copyOutput()} className="inline-flex items-center gap-1.5 text-[#a9a2ae] hover:text-white">{copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Clipboard className="h-3.5 w-3.5" />}{copied ? "Copied" : "Copy"}</button></div><pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words p-4 text-[10px] leading-5 text-[#c9c1ce]">{result.body || "(empty response)"}</pre></section> : null}
    </div>
  );
}
