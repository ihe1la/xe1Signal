import { unstable_cache } from "next/cache";

const TRACKER_ORIGIN = "https://tracker.l30on.top";
export const TRACKER_REVALIDATE_SECONDS = 3 * 60 * 60;

type TrackerAuthMe = {
  username?: unknown;
};

type TrackerInsight = {
  label_id?: unknown;
  name?: unknown;
  color?: unknown;
  seconds?: unknown;
};

type TrackerTrendPoint = {
  bucket?: unknown;
  seconds?: unknown;
};

type TrackerInsights = {
  total_seconds?: unknown;
  by_label?: unknown;
  trend?: unknown;
};

type TrackerProfile = {
  username?: unknown;
  lifetime_seconds?: unknown;
  week_seconds?: unknown;
  xp?: unknown;
  level?: unknown;
  xp_into_level?: unknown;
  xp_to_next?: unknown;
  progress?: unknown;
  badges?: unknown;
};

type TrackerHallOfFameEntry = {
  rank?: unknown;
  username?: unknown;
  seconds?: unknown;
};

type TrackerHallOfFame = {
  entries?: unknown;
};

type TrackerTimerStatus = {
  today?: unknown;
  max_session_ms?: unknown;
  today_entries_seconds?: unknown;
  today_total_seconds?: unknown;
  session?: {
    running?: unknown;
    started_at?: unknown;
    accumulated_ms?: unknown;
    elapsed_ms?: unknown;
    capped?: unknown;
    label_id?: unknown;
    task_id?: unknown;
    description?: unknown;
  } | null;
};

type TrackerLabel = {
  id?: unknown;
  name?: unknown;
  color?: unknown;
  icon?: unknown;
  archived?: unknown;
};

type TrackerTask = {
  id?: unknown;
  title?: unknown;
  parent_id?: unknown;
  status?: unknown;
  priority?: unknown;
};

type TrackerEntry = {
  id?: unknown;
  date?: unknown;
  duration_seconds?: unknown;
  label_id?: unknown;
  description?: unknown;
  started_at?: unknown;
  ended_at?: unknown;
  label_name?: unknown;
  label_color?: unknown;
  task_id?: unknown;
  task_title?: unknown;
  parent_title?: unknown;
};

export type StudySummary = {
  username: string;
  todaySeconds: number;
  weekSeconds: number;
  lifetimeSeconds: number;
  xp: number;
  level: number;
  xpIntoLevel: number;
  xpToNext: number;
  progress: number;
  badgeCount: number;
  timerRunning: boolean;
  todayLabels: Array<{ name: string; color: string; seconds: number }>;
  weeklyTrend: Array<{ bucket: string; seconds: number }>;
  hallOfFame: Array<{ rank: number; username: string; seconds: number }>;
  updatedAt: string;
};

export type StudyTimer = {
  today: string;
  maxSessionMs: number | null;
  todayEntriesSeconds: number;
  todayTotalSeconds: number;
  running: boolean;
  startedAt: string | null;
  accumulatedMs: number;
  elapsedMs: number;
  capped: boolean;
  labelId: number | null;
  taskId: number | null;
  description: string;
};

export type StudyLabel = {
  id: number;
  name: string;
  color: string;
  icon: string;
};

export type StudyTask = {
  id: number;
  title: string;
  parentId: number | null;
  status: string;
  priority: number;
};

export type StudyEntry = {
  id: number;
  date: string;
  durationSeconds: number;
  labelId: number | null;
  description: string;
  startedAt: string | null;
  endedAt: string | null;
  labelName: string;
  labelColor: string;
  taskId: number | null;
  taskTitle: string;
  parentTitle: string;
};

export type StudyWorkspace = {
  timer: StudyTimer;
  labels: StudyLabel[];
  tasks: StudyTask[];
  entries: StudyEntry[];
};

export type TrackerTimerAction = "start" | "pause" | "stop";

export type TrackerTimerActionInput = {
  action: TrackerTimerAction;
  labelId?: number | null;
  taskId?: number | null;
  description?: string | null;
};

export type TrackerEntryInput = {
  date: string;
  durationSeconds: number;
  labelId?: number | null;
  taskId?: number | null;
  description?: string | null;
};

function numberValue(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function nullableNumberValue(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function cookieHeader(): string | null {
  const trackerSession = process.env.TRACKER_SESSION_COOKIE?.trim();
  const l30Session = process.env.TRACKER_L30_SESSION_COOKIE?.trim();
  if (!trackerSession || !l30Session) return null;
  return `tracker_session=${trackerSession}; l30_session=${l30Session}`;
}

async function getTrackerJson<T>(path: string, cookies: string): Promise<T | null> {
  try {
    const response = await fetch(`${TRACKER_ORIGIN}${path}`, {
      headers: {
        accept: "application/json",
        cookie: cookies,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function normalizeTimer(value: TrackerTimerStatus): StudyTimer {
  const session = objectValue(value.session);
  return {
    today: stringValue(value.today),
    maxSessionMs: nullableNumberValue(value.max_session_ms),
    todayEntriesSeconds: numberValue(value.today_entries_seconds),
    todayTotalSeconds: numberValue(value.today_total_seconds),
    running: session.running === true || session.running === "true",
    startedAt: stringValue(session.started_at) || null,
    accumulatedMs: numberValue(session.accumulated_ms),
    elapsedMs: numberValue(session.elapsed_ms),
    capped: session.capped === true || session.capped === "true",
    labelId: nullableNumberValue(session.label_id),
    taskId: nullableNumberValue(session.task_id),
    description: stringValue(session.description),
  };
}

function normalizeLabels(value: unknown): StudyLabel[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const label = item as TrackerLabel;
    return {
      id: numberValue(label.id),
      name: stringValue(label.name) || "Unlabeled",
      color: stringValue(label.color) || "#8b74eb",
      icon: stringValue(label.icon),
    };
  }).filter((label) => label.id > 0 && label.name);
}

function normalizeTasks(value: unknown): StudyTask[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const task = item as TrackerTask;
    return {
      id: numberValue(task.id),
      title: stringValue(task.title) || "Untitled task",
      parentId: nullableNumberValue(task.parent_id),
      status: stringValue(task.status) || "active",
      priority: numberValue(task.priority),
    };
  }).filter((task) => task.id > 0 && task.title);
}

function normalizeEntries(value: unknown): StudyEntry[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const entry = item as TrackerEntry;
    return {
      id: numberValue(entry.id),
      date: stringValue(entry.date),
      durationSeconds: numberValue(entry.duration_seconds),
      labelId: nullableNumberValue(entry.label_id),
      description: stringValue(entry.description),
      startedAt: stringValue(entry.started_at) || null,
      endedAt: stringValue(entry.ended_at) || null,
      labelName: stringValue(entry.label_name),
      labelColor: stringValue(entry.label_color) || "#8b74eb",
      taskId: nullableNumberValue(entry.task_id),
      taskTitle: stringValue(entry.task_title),
      parentTitle: stringValue(entry.parent_title),
    };
  }).filter((entry) => entry.id > 0).slice(0, 20);
}

function labelsFromResponse(value: unknown): StudySummary["todayLabels"] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const insight = (item || {}) as TrackerInsight;
      return {
        name: stringValue(insight.name) || "Unlabeled",
        color: stringValue(insight.color) || "#8b74eb",
        seconds: numberValue(insight.seconds),
      };
    })
    .filter((item) => item.seconds > 0)
    .sort((left, right) => right.seconds - left.seconds)
    .slice(0, 6);
}

function trendFromResponse(value: unknown): StudySummary["weeklyTrend"] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const point = (item || {}) as TrackerTrendPoint;
      return {
        bucket: stringValue(point.bucket),
        seconds: numberValue(point.seconds),
      };
    })
    .filter((item) => item.bucket);
}

function hallOfFameFromResponse(value: unknown): StudySummary["hallOfFame"] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const entry = (item || {}) as TrackerHallOfFameEntry;
      return {
        rank: numberValue(entry.rank),
        username: stringValue(entry.username) || "Unknown",
        seconds: numberValue(entry.seconds),
      };
    })
    .filter((item) => item.username !== "Unknown")
    .slice(0, 5);
}

const getCachedStudySummary = unstable_cache(
  async (): Promise<StudySummary | null> => {
    const cookies = cookieHeader();
    if (!cookies) return null;

    const [authMe, today, week, profile, hallOfFame, timer] = await Promise.all([
      getTrackerJson<TrackerAuthMe>("/api/auth/me", cookies),
      getTrackerJson<TrackerInsights>("/api/insights?range=day", cookies),
      getTrackerJson<TrackerInsights>("/api/insights?range=week", cookies),
      getTrackerJson<TrackerProfile>("/api/me/profile", cookies),
      getTrackerJson<TrackerHallOfFame>("/api/hall-of-fame?period=week", cookies),
      getTrackerJson<TrackerTimerStatus>("/api/timer/status", cookies),
    ]);

    if (!authMe && !profile) return null;

    const profileUsername = stringValue(profile?.username);
    const authUsername = stringValue(authMe?.username);
    const configuredUsername = process.env.TRACKER_USERNAME?.trim() || "";

    return {
      username: profileUsername || authUsername || configuredUsername || "tracker user",
      todaySeconds: numberValue(today?.total_seconds) || numberValue(timer?.today_total_seconds),
      weekSeconds: numberValue(week?.total_seconds) || numberValue(profile?.week_seconds),
      lifetimeSeconds: numberValue(profile?.lifetime_seconds),
      xp: numberValue(profile?.xp),
      level: numberValue(profile?.level),
      xpIntoLevel: numberValue(profile?.xp_into_level),
      xpToNext: numberValue(profile?.xp_to_next),
      progress: numberValue(profile?.progress),
      badgeCount: Array.isArray(profile?.badges) ? profile.badges.length : 0,
      timerRunning: Boolean(timer?.session?.running),
      todayLabels: labelsFromResponse(today?.by_label),
      weeklyTrend: trendFromResponse(week?.trend),
      hallOfFame: hallOfFameFromResponse(hallOfFame?.entries),
      updatedAt: new Date().toISOString(),
    };
  },
  ["tracker-study-summary-v1"],
  { revalidate: TRACKER_REVALIDATE_SECONDS },
);

export async function getTrackerStudySummary(): Promise<StudySummary | null> {
  return getCachedStudySummary();
}

export async function getTrackerStudyWorkspace(): Promise<StudyWorkspace | null> {
  const cookies = cookieHeader();
  if (!cookies) return null;

  const [timer, labels, entries, tasks] = await Promise.all([
    getTrackerJson<TrackerTimerStatus>("/api/timer/status", cookies),
    getTrackerJson<{ labels?: unknown }>("/api/labels", cookies),
    getTrackerJson<{ entries?: unknown }>("/api/entries", cookies),
    getTrackerJson<{ tasks?: unknown }>("/api/tasks?status=active&sort=priority", cookies),
  ]);

  if (!timer) return null;
  return {
    timer: normalizeTimer(timer),
    labels: normalizeLabels(labels?.labels),
    tasks: normalizeTasks(tasks?.tasks),
    entries: normalizeEntries(entries?.entries),
  };
}

function trackerMetadata(input: { labelId?: number | null; taskId?: number | null; description?: string | null }) {
  return {
    label_id: input.labelId ?? null,
    task_id: input.taskId ?? null,
    description: input.description?.trim() || null,
  };
}

async function trackerMutation(path: string, method: "POST" | "PATCH" | "DELETE", cookies: string, body?: unknown): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(`${TRACKER_ORIGIN}${path}`, {
      method,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        cookie: cookies,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (response.ok) return { ok: true };
    const payload = await response.json().catch(() => null) as { error?: unknown } | null;
    return { ok: false, error: stringValue(payload?.error) || "The tracker rejected the update." };
  } catch {
    return { ok: false, error: "The tracker could not be reached." };
  }
}

export async function updateTrackerTimer(input: TrackerTimerActionInput): Promise<{ workspace: StudyWorkspace | null; error?: string }> {
  const cookies = cookieHeader();
  if (!cookies) return { workspace: null, error: "Study tracking is not configured." };

  const metadata = trackerMetadata(input);
  const metadataResult = await trackerMutation("/api/timer/meta", "PATCH", cookies, metadata);
  if (!metadataResult.ok && input.action !== "pause") return { workspace: null, error: metadataResult.error };

  const path = input.action === "start" ? "/api/timer/start" : input.action === "pause" ? "/api/timer/pause" : "/api/timer/stop";
  const result = await trackerMutation(path, "POST", cookies, input.action === "pause" ? undefined : metadata);
  if (!result.ok) return { workspace: null, error: result.error };
  return { workspace: await getTrackerStudyWorkspace() };
}

export async function createTrackerEntry(input: TrackerEntryInput): Promise<{ workspace: StudyWorkspace | null; error?: string }> {
  const cookies = cookieHeader();
  if (!cookies) return { workspace: null, error: "Study tracking is not configured." };
  const result = await trackerMutation("/api/entries", "POST", cookies, {
    date: input.date,
    duration_seconds: input.durationSeconds,
    ...trackerMetadata(input),
  });
  if (!result.ok) return { workspace: null, error: result.error };
  return { workspace: await getTrackerStudyWorkspace() };
}

export async function updateTrackerEntry(entryId: number, input: TrackerEntryInput): Promise<{ workspace: StudyWorkspace | null; error?: string }> {
  const cookies = cookieHeader();
  if (!cookies) return { workspace: null, error: "Study tracking is not configured." };
  const result = await trackerMutation(`/api/entries/${entryId}`, "PATCH", cookies, {
    date: input.date,
    duration_seconds: input.durationSeconds,
    ...trackerMetadata(input),
  });
  if (!result.ok) return { workspace: null, error: result.error };
  return { workspace: await getTrackerStudyWorkspace() };
}

export async function deleteTrackerEntry(entryId: number): Promise<{ workspace: StudyWorkspace | null; error?: string }> {
  const cookies = cookieHeader();
  if (!cookies) return { workspace: null, error: "Study tracking is not configured." };
  const result = await trackerMutation(`/api/entries/${entryId}`, "DELETE", cookies);
  if (!result.ok) return { workspace: null, error: result.error };
  return { workspace: await getTrackerStudyWorkspace() };
}

export function trackerUsernameMatches(username?: string | null): boolean {
  const configured = process.env.TRACKER_USERNAME?.trim().toLowerCase();
  return Boolean(configured && username && configured === username.trim().toLowerCase());
}
