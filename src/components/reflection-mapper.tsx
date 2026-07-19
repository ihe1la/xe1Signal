"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Copy, ChevronDown, ChevronUp, Play, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Result = { id?: string; name: string; occurrenceIndex: number; marker: string; reflected: boolean; reflectionCount: number; context: string | null; encoding: string | null; snippet: string | null };
type Run = { runId: string; finalRequestUrl: string; statusCode: number; contentType: string; responseSize: number; responseTimeMs: number; requestCount: number; results: Result[] };

function copy(value: string) { return navigator.clipboard.writeText(value); }

export function ReflectionMapper() {
  const [targetUrl, setTargetUrl] = useState("");
  const [customHeaders, setCustomHeaders] = useState("");
  const [cookie, setCookie] = useState("");
  const [markerPrefix, setMarkerPrefix] = useState("REFLECT");
  const [delayMs, setDelayMs] = useState(0);
  const [mode, setMode] = useState<"combined" | "separate">("combined");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [run, setRun] = useState<Run | null>(null);
  const [reflectedOnly, setReflectedOnly] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [savedSignal, setSavedSignal] = useState<string | null>(null);

  const preview = useMemo(() => {
    try {
      const url = new URL(targetUrl);
      const counts = new Map<string, number>();
      return [...url.searchParams.entries()].map(([name], index) => {
        const occurrenceIndex = counts.get(name) || 0;
        counts.set(name, occurrenceIndex + 1);
        return { name, occurrenceIndex, marker: `${markerPrefix || "REFLECT"}_${index + 1}_••••` };
      });
    } catch { return []; }
  }, [targetUrl, markerPrefix]);

  async function execute() {
    setRunning(true); setError(""); setRun(null); setSavedSignal(null);
    try {
      const response = await fetch("/api/internal/reflection-mapper/run", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ targetUrl, customHeaders, cookie, markerPrefix, delayMs, mode }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Run failed");
      setRun(data);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Run failed"); }
    finally { setRunning(false); }
  }

  async function save(resultId?: string) {
    if (!run) return;
    setError("");
    const response = await fetch("/api/internal/reflection-mapper/save", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ runId: run.runId, resultId, notes }) });
    const data = await response.json();
    if (!response.ok) return setError(data.error || "Save failed");
    setSavedSignal(data.signalId);
  }

  const visibleResults = run?.results.filter((result) => !reflectedOnly || result.reflected) || [];
  const reflectedCount = run?.results.filter((result) => result.reflected).length || 0;
  const occurrenceCount = run?.results.reduce((sum, result) => sum + result.reflectionCount, 0) || 0;
  const summary = run ? [`Reflection Mapper`, run.finalRequestUrl, `Status ${run.statusCode} · ${run.contentType} · ${run.responseSize} bytes · ${run.responseTimeMs} ms`, ...run.results.map((result) => `${result.name}[${result.occurrenceIndex}]: ${result.reflected ? `${result.reflectionCount} · ${result.context} · ${result.encoding}` : "not reflected"}`)].join("\n") : "";

  return <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6">
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="space-y-2"><p className="font-mono text-xs uppercase tracking-[.2em] text-violet-400">Owner · Test Lab</p><h1 className="text-3xl font-semibold">Reflection Mapper</h1><p className="max-w-3xl text-sm text-muted-foreground">Map harmless unique markers across query parameters on explicitly allowlisted systems. Reflection does not prove XSS. Encoding, browser parsing, CSP, sanitization, and DOM usage must be reviewed manually.</p></header>

      <section className="rounded-xl border border-border bg-card p-5"><h2 className="mb-5 font-medium">1. Target form</h2><div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2 lg:col-span-2"><Label htmlFor="target">Target URL</Label><Input id="target" value={targetUrl} onChange={(event) => setTargetUrl(event.target.value)} placeholder="https://authorized.example/search?q=hello&page=1" /></div>
        <div className="space-y-2"><Label htmlFor="headers">Custom headers (optional)</Label><Textarea id="headers" value={customHeaders} onChange={(event) => setCustomHeaders(event.target.value)} placeholder="X-Test-Context: reflection-lab" /></div>
        <div className="space-y-2"><Label htmlFor="cookie">Cookie header (optional, never stored)</Label><Textarea id="cookie" value={cookie} onChange={(event) => setCookie(event.target.value)} placeholder="session=..." /></div>
        <div className="space-y-2"><Label htmlFor="prefix">Marker prefix</Label><Input id="prefix" value={markerPrefix} onChange={(event) => setMarkerPrefix(event.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="delay">Request delay (ms)</Label><Input id="delay" type="number" min={0} max={5000} value={delayMs} onChange={(event) => setDelayMs(Number(event.target.value))} /></div>
        <fieldset className="flex gap-4 text-sm lg:col-span-2"><legend className="mb-2 text-muted-foreground">Request mode</legend>{(["combined", "separate"] as const).map((value) => <label key={value} className="flex items-center gap-2"><input type="radio" checked={mode === value} onChange={() => setMode(value)} /> {value === "combined" ? "Combined request" : "Separate requests"}</label>)}</fieldset>
      </div></section>

      <section className="rounded-xl border border-border bg-card p-5"><h2 className="mb-4 font-medium">2. Generated parameter preview</h2>{preview.length ? <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{preview.map((item) => <div key={`${item.name}-${item.occurrenceIndex}`} className="rounded-lg border border-border bg-background p-3 font-mono text-xs"><span className="text-muted-foreground">{item.name}[{item.occurrenceIndex}]</span><span className="mt-1 block break-all text-violet-300">{item.marker}</span></div>)}</div> : <p className="text-sm text-muted-foreground">Enter an allowlisted URL with at least one query parameter.</p>}</section>

      <section className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-5"><div className="mr-auto"><h2 className="font-medium">3. Run progress</h2><p className="mt-1 text-xs text-muted-foreground">Sequential requests · 10 second timeout · 1 MB body limit · maximum 30 parameters</p></div><Button onClick={execute} disabled={running || !preview.length}><Play className="mr-2 h-4 w-4" />{running ? "Mapping…" : "Run mapper"}</Button></section>
      {error && <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}

      {run && <section className="space-y-4 rounded-xl border border-border bg-card p-5"><div className="flex flex-wrap items-center gap-3"><h2 className="mr-auto font-medium">4. Results</h2><Button variant="outline" size="sm" onClick={() => copy(run.finalRequestUrl)}><Copy className="mr-2 h-3.5 w-3.5" />URL</Button><Button variant="outline" size="sm" onClick={() => copy(summary)}><Copy className="mr-2 h-3.5 w-3.5" />Summary</Button></div>
        <dl className="grid gap-3 text-sm sm:grid-cols-3 lg:grid-cols-6">{[["Status", run.statusCode], ["Content type", run.contentType], ["Size", `${run.responseSize} B`], ["Time", `${run.responseTimeMs} ms`], ["Reflected", `${reflectedCount}/${run.results.length}`], ["Occurrences", occurrenceCount]].map(([label, value]) => <div key={label} className="rounded-lg border border-border p-3"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-all">{value}</dd></div>)}</dl>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={reflectedOnly} onChange={(event) => setReflectedOnly(event.target.checked)} /> Reflected only</label>
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-border text-xs text-muted-foreground"><tr>{["Parameter", "Marker", "Reflected", "Count", "Context", "Encoding", ""].map((heading) => <th key={heading} className="p-3 font-normal">{heading}</th>)}</tr></thead><tbody>{visibleResults.map((result) => <tr key={result.id || result.marker} className="border-b border-border/70 align-top"><td className="p-3 font-mono">{result.name}[{result.occurrenceIndex}]</td><td className="max-w-56 break-all p-3 font-mono text-xs text-violet-300">{result.marker}</td><td className="p-3">{result.reflected ? "Yes" : "No"}</td><td className="p-3">{result.reflectionCount}</td><td className="p-3">{result.context || "—"}</td><td className="p-3">{result.encoding || "—"}</td><td className="p-3"><div className="flex gap-1"><Button variant="ghost" size="icon" title="Copy marker" onClick={() => copy(result.marker)}><Copy className="h-4 w-4" /></Button><Button variant="ghost" size="icon" title="Expand context" disabled={!result.snippet} onClick={() => setExpanded(expanded === result.marker ? null : result.marker)}>{expanded === result.marker ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</Button>{result.id && <Button variant="ghost" size="icon" title="Save result as Signal" onClick={() => save(result.id)}><Save className="h-4 w-4" /></Button>}</div>{expanded === result.marker && result.snippet && <pre className="mt-2 max-w-md whitespace-pre-wrap break-all rounded bg-background p-3 text-xs text-muted-foreground">{result.snippet}</pre>}</td></tr>)}</tbody></table></div>
        <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row"><Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional notes for the private Signal" /><Button onClick={() => save()}><Save className="mr-2 h-4 w-4" />Save full run as Signal</Button>{savedSignal && <Button asChild variant="outline"><Link href={`/signals/${savedSignal}`}>Open saved Signal</Link></Button>}</div>
      </section>}
    </div>
  </main>;
}
