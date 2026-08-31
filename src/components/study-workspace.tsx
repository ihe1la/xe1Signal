"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Clock3, Pause, Pencil, Play, RefreshCw, Square, Trash2, X } from "lucide-react";
import type { StudyEntry, StudyTask, StudyWorkspace as TrackerStudyWorkspace } from "@/lib/tracker-client";

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

export function StudyWorkspace({ initialWorkspace }: { initialWorkspace: TrackerStudyWorkspace }) {
  const router = useRouter();
  const [workspace, setWorkspace] = React.useState(initialWorkspace);
  const [loadedAt, setLoadedAt] = React.useState(() => Date.now());
  const [now, setNow] = React.useState(() => Date.now());
  const [labelId, setLabelId] = React.useState(initialWorkspace.timer.labelId ? String(initialWorkspace.timer.labelId) : "");
  const [taskId, setTaskId] = React.useState(initialWorkspace.timer.taskId ? String(initialWorkspace.timer.taskId) : "");
  const [description, setDescription] = React.useState(initialWorkspace.timer.description);
  const [loading, setLoading] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [entryActionId, setEntryActionId] = React.useState<number | null>(null);
  const [editingEntry, setEditingEntry] = React.useState<StudyEntry | null>(null);
  const [editDate, setEditDate] = React.useState("");
  const [editDuration, setEditDuration] = React.useState("");
  const [editLabelId, setEditLabelId] = React.useState("");
  const [editTaskId, setEditTaskId] = React.useState("");
  const [editDescription, setEditDescription] = React.useState("");
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

  function openEntryEditor(entry: StudyEntry) {
    setError(null);
    setEditingEntry(entry);
    setEditDate(entry.date);
    setEditDuration(String(entry.durationSeconds));
    setEditLabelId(entry.labelId ? String(entry.labelId) : "");
    setEditTaskId(entry.taskId ? String(entry.taskId) : "");
    setEditDescription(entry.description);
  }

  async function resumeEntry(entry: StudyEntry) {
    if (workspace.timer.running) {
      setError("Pause the current session before resuming another log.");
      return;
    }
    setEntryActionId(entry.id);
    setError(null);
    try {
      const response = await fetch("/api/study/timer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "start", labelId: entry.labelId, taskId: entry.taskId, description: entry.description || null }),
      });
      const next = await response.json().catch(() => null) as TrackerStudyWorkspace | { error?: string } | null;
      if (!response.ok || !next || !("timer" in next)) {
        setError((next && "error" in next && next.error) || "The session could not be resumed.");
        return;
      }
      syncWorkspace(next);
      router.refresh();
    } catch {
      setError("The session could not be resumed.");
    } finally {
      setEntryActionId(null);
    }
  }

  async function saveEntryEdit() {
    if (!editingEntry) return;
    const durationSeconds = Number.parseInt(editDuration, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(editDate) || !Number.isSafeInteger(durationSeconds) || durationSeconds <= 0) {
      setError("Enter a valid date and a duration greater than zero.");
      return;
    }

    setEntryActionId(editingEntry.id);
    setError(null);
    try {
      const response = await fetch(`/api/study/entries/${editingEntry.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          date: editDate,
          durationSeconds,
          labelId: editLabelId ? Number(editLabelId) : null,
          taskId: editTaskId ? Number(editTaskId) : null,
          description: editDescription.trim() || null,
        }),
      });
      const next = await response.json().catch(() => null) as TrackerStudyWorkspace | { error?: string } | null;
      if (!response.ok || !next || !("timer" in next)) {
        setError((next && "error" in next && next.error) || "The study log could not be updated.");
        return;
      }
      syncWorkspace(next);
      setEditingEntry(null);
      router.refresh();
    } catch {
      setError("The study log could not be updated.");
    } finally {
      setEntryActionId(null);
    }
  }

  async function deleteEntry(entry: StudyEntry) {
    if (!window.confirm(`Delete “${entryTitle(entry)}” from your study log?`)) return;
    setEntryActionId(entry.id);
    setError(null);
    try {
      const response = await fetch(`/api/study/entries/${entry.id}`, { method: "DELETE" });
      const next = await response.json().catch(() => null) as TrackerStudyWorkspace | { error?: string } | null;
      if (!response.ok || !next || !("timer" in next)) {
        setError((next && "error" in next && next.error) || "The study log could not be deleted.");
        return;
      }
      syncWorkspace(next);
      if (editingEntry?.id === entry.id) setEditingEntry(null);
      router.refresh();
    } catch {
      setError("The study log could not be deleted.");
    } finally {
      setEntryActionId(null);
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
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button type="button" onClick={() => void resumeEntry(entry)} disabled={loading || entryActionId !== null || workspace.timer.running} className="grid h-8 w-8 place-items-center rounded-md text-violet-400/70 transition hover:bg-violet-400/[.08] hover:text-violet-200 disabled:opacity-35" aria-label={`Resume ${entryTitle(entry)}`} title="Resume as timer">
                        <Play className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => openEntryEditor(entry)} disabled={loading || entryActionId !== null} className="grid h-8 w-8 place-items-center rounded-md text-zinc-600 transition hover:bg-white/[.05] hover:text-zinc-200 disabled:opacity-35" aria-label={`Edit ${entryTitle(entry)}`} title="Edit study log">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => void deleteEntry(entry)} disabled={loading || entryActionId !== null} className="grid h-8 w-8 place-items-center rounded-md text-zinc-600 transition hover:bg-rose-400/[.06] hover:text-rose-300 disabled:opacity-35" aria-label={`Delete ${entryTitle(entry)}`} title="Delete study log">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : <div className="mt-5 rounded-lg border border-dashed border-white/[.08] px-4 py-8 text-center"><p className="font-sans text-xs text-zinc-500">No sessions logged today.</p><p className="mt-1 font-mono text-[10px] text-zinc-700">Your completed focus will appear here.</p></div>}
          </div>
        </div>

      </section>

      {editingEntry && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/65 px-4 py-6">
          <section role="dialog" aria-modal="true" aria-labelledby="edit-study-log-title" className="w-full max-w-lg rounded-xl border border-white/[.1] bg-[#0d0e14] p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[.16em] text-zinc-600">study log</p>
                <h2 id="edit-study-log-title" className="mt-2 font-sans text-lg font-medium text-zinc-100">Edit session</h2>
              </div>
              <button type="button" onClick={() => setEditingEntry(null)} disabled={entryActionId !== null} className="grid h-8 w-8 place-items-center rounded-md text-zinc-600 transition hover:bg-white/[.05] hover:text-zinc-200 disabled:opacity-35" aria-label="Close edit study log">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form className="mt-6 space-y-4" onSubmit={(event) => { event.preventDefault(); void saveEntryEdit(); }}>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="font-mono text-[10px] text-zinc-500">Date
                  <input type="date" value={editDate} onChange={(event) => setEditDate(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-white/[.07] bg-[#090a0e] px-3 text-xs text-zinc-300 outline-none transition focus:border-violet-300/30" />
                </label>
                <label className="font-mono text-[10px] text-zinc-500">Duration (seconds)
                  <input type="number" min="1" max={24 * 60 * 60} step="1" value={editDuration} onChange={(event) => setEditDuration(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-white/[.07] bg-[#090a0e] px-3 text-xs text-zinc-300 outline-none transition focus:border-violet-300/30" />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="font-mono text-[10px] text-zinc-500">Label
                  <select value={editLabelId} onChange={(event) => setEditLabelId(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-white/[.07] bg-[#090a0e] px-3 text-xs text-zinc-300 outline-none transition focus:border-violet-300/30">
                    <option value="">No label</option>
                    {workspace.labels.map((label) => <option key={label.id} value={label.id}>{label.name}</option>)}
                  </select>
                </label>
                <label className="font-mono text-[10px] text-zinc-500">Task
                  <select value={editTaskId} onChange={(event) => setEditTaskId(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-white/[.07] bg-[#090a0e] px-3 text-xs text-zinc-300 outline-none transition focus:border-violet-300/30">
                    <option value="">No task</option>
                    {workspace.tasks.map((task) => <option key={task.id} value={task.id}>{taskLabel(task, workspace.tasks)}</option>)}
                  </select>
                </label>
              </div>
              <label className="block font-mono text-[10px] text-zinc-500">Session note
                <input value={editDescription} onChange={(event) => setEditDescription(event.target.value)} maxLength={1000} placeholder="What were you working on?" className="mt-2 h-10 w-full rounded-lg border border-white/[.07] bg-[#090a0e] px-3 text-xs text-zinc-300 outline-none transition placeholder:text-zinc-700 focus:border-violet-300/30" />
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditingEntry(null)} disabled={entryActionId !== null} className="h-10 rounded-lg border border-white/[.08] px-4 font-mono text-[10px] text-zinc-400 transition hover:bg-white/[.04] hover:text-zinc-200 disabled:opacity-35">Cancel</button>
                <button type="submit" disabled={entryActionId !== null} className="h-10 rounded-lg border border-violet-300/25 bg-violet-400/[.14] px-4 font-mono text-[10px] text-violet-100 transition hover:bg-violet-400/[.2] disabled:opacity-50">Save changes</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {error && <p role="alert" className="font-mono text-[10px] text-rose-300">{error}</p>}
    </div>
  );
}
