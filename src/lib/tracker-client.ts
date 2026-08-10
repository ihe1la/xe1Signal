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
  session?: {
    running?: unknown;
  } | null;
  today_total_seconds?: unknown;
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

function numberValue(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
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

export function trackerUsernameMatches(username?: string | null): boolean {
  const configured = process.env.TRACKER_USERNAME?.trim().toLowerCase();
  return Boolean(configured && username && configured === username.trim().toLowerCase());
}
