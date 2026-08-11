"use client";

import * as React from "react";
import { Clock3, Pause, Play, Plus, RefreshCw, Square } from "lucide-react";
import type { StudyEntry, StudySummary, StudyTask, StudyWorkspace as TrackerStudyWorkspace } from "@/lib/tracker-client";

function formatTimer(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

function formatDuration(seconds: number) {
  const totalMinutes = Math.max(0, Math.round(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours && minutes) return `${hours}h ${minutes}m`;
  if (hours) return `${hours}h`;
  return `${minutes}m`;
}

function formatTrendBucket(bucket: string) {
  const date = new Date(bucket);
  if (Number.isNaN(date.getTime())) return bucket.slice(0, 10);
  return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date);
}

function formatClock(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function formatEntryRange(entry: StudyEntry) {
  const start = formatClock(entry.startedAt);
  const end = formatClock(entry.endedAt);
  if (start && end) return `${start} – ${end}`;
  return entry.date;
}

function entryTitle(entry: StudyEntry) {
  return entry.description || entry.taskTitle || entry.labelName || "Focused session";
}

function taskLabel(task: StudyTask, tasks: StudyTask[]) {
  const parent = task.parentId ? tasks.find((candidate) => candidate.id === task.parentId) : null;
  return parent ? `${parent.title} · ${task.title}` : task.title;
}

function ActivityRhythm({ summary }: { summary: StudySummary | null | undefined }) {
  const trend = summary?.weeklyTrend || [];
  if (!trend.length) return null;

  const maxTrend = Math.max(...trend.map((item) => item.seconds), 1);

  return (
    <section className="border-t border-white/[.06] px-5 py-5 sm:px-7" aria-label="Weekly study activity">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-sans text-sm font-medium text-zinc-200">Activity rhythm</p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[.14em] text-zinc-600">last 7 days</p>
        </div>
        <p className="font-mono text-[10px] text-zinc-500">{formatDuration(summary?.weekSeconds ?? 0)} total</p>
      </div>

      <div className="mt-5 grid grid-cols-7 items-end gap-2 sm:gap-4">
        {trend.map((item) => (
          <div key={item.bucket} className="min-w-0 text-center">
            <div className="mx-auto flex h-20 w-full max-w-10 items-end rounded-md bg-white/[.02] p-1">
              <div className="w-full rounded-[3px] bg-gradient-to-t from-violet-500/90 to-fuchsia-300/70" style={{ height: `${Math.max(7, (item.seconds / maxTrend) * 100)}%` }} title={formatDuration(item.seconds)} />
            </div>
            <p className="mt-2 truncate font-sans text-[10px] text-zinc-500">{formatTrendBucket(item.bucket)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function StudyWorkspace({ initialWorkspace, summary }: { initialWorkspace: TrackerStudyWorkspace; summary?: StudySummary | null }) {
  const [workspace, setWorkspace] = React.useState(initialWorkspace);
  const [loadedAt, setLoadedAt] = React.useState(() => Date.now());
  const [now, setNow] = React.useState(() => Date.now());
  const [labelId, setLabelId] = React.useState(initialWorkspace.timer.labelId ? String(initialWorkspace.timer.labelId) : "");
  const [taskId, setTaskId] = React.useState(initialWorkspace.timer.taskId ? String(initialWorkspace.timer.taskId) : "");
  const [description, setDescription] = React.useState(initialWorkspace.timer.description);
  const [hours, setHours] = React.useState("0");
  const [minutes, setMinutes] = React.useState("25");
  const [entryDescription, setEntryDescription] = React.useState("");
  const [entryLabelId, setEntryLabelId] = React.useState("");
  const [entryTaskId, setEntryTaskId] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!workspace.timer.running) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [workspace.timer.running]);

  const elapsedMs = workspace.timer.running
    ? workspace.timer.elapsedMs + Math.max(0, now - loadedAt)
    : workspace.timer.elapsedMs;

  function syncWorkspace(next: TrackerStudyWorkspace) {
    setWorkspace(next);
    setLoadedAt(Date.now());
    setNow(Date.now());
    setLabelId(next.timer.labelId ? String(next.timer.labelId) : "");
    setTaskId(next.timer.taskId ? String(next.timer.taskId) : "");
    setDescription(next.timer.description);
  }

  async function refresh() {
    setRefreshing(true);
    setError(null);
    try {
      const response = await fetch("/api/study", { cache: "no-store" });
      const next = await response.json().catch(() => null) as TrackerStudyWorkspace | { error?: string } | null;
      if (!response.ok || !next || !("timer" in next)) {
        setError((next && "error" in next && next.error) || "Study data is unavailable right now.");
        return;
      }
      syncWorkspace(next);
    } catch {
      setError("Study data is unavailable right now.");
    } finally {
      setRefreshing(false);
    }
  }

  async function control(action: "start" | "pause" | "stop") {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/study/timer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action,
          labelId: labelId ? Number(labelId) : null,
          taskId: taskId ? Number(taskId) : null,
          description: description.trim() || null,
        }),
      });
      const next = await response.json().catch(() => null) as TrackerStudyWorkspace | { error?: string } | null;
      if (!response.ok || !next || !("timer" in next)) {
        setError((next && "error" in next && next.error) || "The timer could not be updated.");
        return;
      }
      syncWorkspace(next);
    } catch {
      setError("The timer could not be updated.");
    } finally {
      setLoading(false);
    }
  }

  async function addEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const durationSeconds = (Number(hours) * 60 + Number(minutes)) * 60;
    if (!Number.isInteger(durationSeconds) || durationSeconds <= 0) {
      setError("Enter a duration before saving the session.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/study/entries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          date: workspace.timer.today,
          durationSeconds,
          labelId: entryLabelId ? Number(entryLabelId) : null,
          taskId: entryTaskId ? Number(entryTaskId) : null,
          description: entryDescription.trim() || null,
        }),
      });
      const next = await response.json().catch(() => null) as TrackerStudyWorkspace | { error?: string } | null;
      if (!response.ok || !next || !("timer" in next)) {
        setError((next && "error" in next && next.error) || "The study session could not be saved.");
        return;
      }
      syncWorkspace(next);
      setHours("0");
      setMinutes("25");
      setEntryDescription("");
    } catch {
      setError("The study session could not be saved.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-xl border border-white/[.07] bg-gradient-to-br from-[#0c0d13] via-[#0b0c11] to-[#090a0e]" aria-label="Focus timer">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[.06] px-5 py-5 sm:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-violet-300/15 bg-violet-400/[.08] text-violet-300"><Clock3 className="h-4 w-4" /></span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="font-sans text-sm font-medium text-zinc-100">Focus timer</h2>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[.07] bg-white/[.025] px-2 py-1 font-mono text-[9px] uppercase tracking-[.12em] text-zinc-500"><i className={`h-1.5 w-1.5 rounded-full ${workspace.timer.running ? "bg-violet-300 shadow-[0_0_8px_rgba(167,139,250,.8)]" : "bg-zinc-600"}`} />{workspace.timer.running ? "running" : "idle"}</span>
              </div>
              <p className="mt-1 truncate font-mono text-[10px] text-zinc-600">{workspace.timer.today} · {formatDuration(workspace.timer.todayTotalSeconds)} logged today</p>
            </div>
          </div>
          <button type="button" onClick={() => void refresh()} disabled={refreshing || loading} className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 font-mono text-[10px] text-zinc-500 transition hover:bg-white/[.04] hover:text-zinc-200 disabled:opacity-50" aria-label="Refresh study data">
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1.06fr)_minmax(300px,.94fr)]">
          <div className="px-5 py-8 sm:px-7 lg:border-r lg:border-white/[.06]">
            <p className="font-mono text-[10px] uppercase tracking-[.18em] text-zinc-600">current session</p>
            <p className="mt-4 font-mono text-5xl font-medium tabular-nums tracking-[-.07em] text-zinc-100 sm:text-6xl xl:text-7xl" aria-live="polite">{formatTimer(elapsedMs)}</p>
            <p className="mt-3 font-sans text-xs text-zinc-500">{workspace.timer.running ? "Stay with the signal. Your session is running." : elapsedMs > 0 ? "Session paused. Resume when you are ready." : "Start a focused session when you are ready."}</p>

            <div className="mt-7 grid max-w-xl grid-cols-2 gap-2">
              <button type="button" onClick={() => void control(workspace.timer.running ? "pause" : "start")} disabled={loading} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-violet-300/25 bg-violet-400/[.14] px-4 font-mono text-[10px] text-violet-100 transition hover:bg-violet-400/[.2] disabled:opacity-50">
                {workspace.timer.running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                {workspace.timer.running ? "Pause" : "Start focus"}
              </button>
              <button type="button" onClick={() => void control("stop")} disabled={loading || (!workspace.timer.running && elapsedMs <= 0)} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-white/[.09] bg-white/[.02] px-4 font-mono text-[10px] text-zinc-300 transition hover:border-white/[.15] hover:bg-white/[.04] hover:text-zinc-100 disabled:opacity-50">
                <Square className="h-3.5 w-3.5" /> Stop & save
              </button>
            </div>

            <div className="mt-8 max-w-xl border-t border-white/[.06] pt-5">
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-[10px] uppercase tracking-[.14em] text-zinc-500">Session context</p>
                <span className="font-mono text-[10px] text-zinc-700">saved with timer</span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="font-mono text-[10px] text-zinc-500">Label
                  <select value={labelId} onChange={(event) => setLabelId(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-white/[.07] bg-[#090a0e] px-3 text-xs text-zinc-300 outline-none transition focus:border-violet-300/30">
                    <option value="">No label</option>
                    {workspace.labels.map((label) => <option key={label.id} value={label.id}>{label.name}</option>)}
                  </select>
                </label>
                <label className="font-mono text-[10px] text-zinc-500">Task
                  <select value={taskId} onChange={(event) => setTaskId(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-white/[.07] bg-[#090a0e] px-3 text-xs text-zinc-300 outline-none transition focus:border-violet-300/30">
                    <option value="">No task</option>
                    {workspace.tasks.map((task) => <option key={task.id} value={task.id}>{taskLabel(task, workspace.tasks)}</option>)}
                  </select>
                </label>
              </div>
              <label className="mt-3 block font-mono text-[10px] text-zinc-500">Session note
                <input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} placeholder="What are you working on?" className="mt-2 h-10 w-full rounded-lg border border-white/[.07] bg-[#090a0e] px-3 text-xs text-zinc-300 outline-none transition placeholder:text-zinc-700 focus:border-violet-300/30" />
              </label>
            </div>
          </div>

          <div className="min-w-0 border-t border-white/[.06] px-5 py-6 sm:px-7 lg:border-t-0">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-sans text-sm font-medium text-zinc-200">Recent sessions</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[.14em] text-zinc-600">latest focus</p>
              </div>
              <span className="font-mono text-[10px] text-zinc-600">{workspace.entries.length ? `${Math.min(workspace.entries.length, 6)} shown` : "today"}</span>
            </div>
            {workspace.entries.length ? (
              <div className="mt-5 divide-y divide-white/[.05]">
                {workspace.entries.slice(0, 6).map((entry) => (
                  <div key={entry.id} className="flex items-center gap-3 py-4 first:pt-0 last:pb-0">
                    <i className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: entry.labelColor || "#8f7be9" }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-sans text-xs text-zinc-300">{entryTitle(entry)}</p>
                      <p className="mt-1 truncate font-mono text-[10px] text-zinc-600">{formatEntryRange(entry)}{entry.labelName ? ` · ${entry.labelName}` : ""}</p>
                    </div>
                    <span className="shrink-0 font-mono text-[10px] tabular-nums text-zinc-400">{formatDuration(entry.durationSeconds)}</span>
                  </div>
                ))}
              </div>
            ) : <div className="mt-5 rounded-lg border border-dashed border-white/[.08] px-4 py-8 text-center"><p className="font-sans text-xs text-zinc-500">No sessions logged today.</p><p className="mt-1 font-mono text-[10px] text-zinc-700">Your completed focus will appear here.</p></div>}
          </div>
        </div>

        <ActivityRhythm summary={summary} />
      </section>

      <section className="rounded-xl border border-white/[.07] bg-white/[.015] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5"><span className="grid h-8 w-8 place-items-center rounded-lg border border-white/[.07] bg-white/[.025] text-zinc-500"><Plus className="h-4 w-4" /></span><div><h2 className="font-sans text-sm font-medium text-zinc-200">Log a manual session</h2><p className="mt-1 font-mono text-[10px] uppercase tracking-[.14em] text-zinc-600">add focus from earlier today</p></div></div>
        </div>
        <form onSubmit={addEntry} className="mt-5 grid gap-3 md:grid-cols-[100px_100px_minmax(0,1fr)_auto] md:items-end">
          <label className="font-mono text-[10px] text-zinc-500">Hours<input type="number" min="0" max="24" value={hours} onChange={(event) => setHours(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-white/[.07] bg-[#090a0e] px-3 text-xs text-zinc-300 outline-none transition focus:border-violet-300/30" /></label>
          <label className="font-mono text-[10px] text-zinc-500">Minutes<input type="number" min="0" max="59" value={minutes} onChange={(event) => setMinutes(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-white/[.07] bg-[#090a0e] px-3 text-xs text-zinc-300 outline-none transition focus:border-violet-300/30" /></label>
          <label className="font-mono text-[10px] text-zinc-500">Description<input value={entryDescription} onChange={(event) => setEntryDescription(event.target.value)} maxLength={1000} placeholder="Optional note" className="mt-2 h-10 w-full rounded-lg border border-white/[.07] bg-[#090a0e] px-3 text-xs text-zinc-300 outline-none transition placeholder:text-zinc-700 focus:border-violet-300/30" /></label>
          <button type="submit" disabled={loading} className="h-10 rounded-lg border border-white/[.09] px-4 font-mono text-[10px] text-zinc-300 transition hover:border-violet-300/30 hover:bg-violet-400/[.05] hover:text-violet-200 disabled:opacity-50">Save session</button>
        </form>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <select aria-label="Session label" value={entryLabelId} onChange={(event) => setEntryLabelId(event.target.value)} className="h-10 rounded-lg border border-white/[.07] bg-[#090a0e] px-3 font-mono text-[10px] text-zinc-400 outline-none transition focus:border-violet-300/30"><option value="">No label</option>{workspace.labels.map((label) => <option key={label.id} value={label.id}>{label.name}</option>)}</select>
          <select aria-label="Session task" value={entryTaskId} onChange={(event) => setEntryTaskId(event.target.value)} className="h-10 rounded-lg border border-white/[.07] bg-[#090a0e] px-3 font-mono text-[10px] text-zinc-400 outline-none transition focus:border-violet-300/30"><option value="">No task</option>{workspace.tasks.map((task) => <option key={task.id} value={task.id}>{taskLabel(task, workspace.tasks)}</option>)}</select>
        </div>
      </section>

      {error && <p role="alert" className="font-mono text-[10px] text-rose-300">{error}</p>}
    </div>
  );
}
