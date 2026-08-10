import type { StudySummary } from "@/lib/tracker-client";

const TRACKER_URL = "https://tracker.l30on.top/";

function formatDuration(seconds: number) {
  const totalMinutes = Math.max(0, Math.round(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours && minutes) return `${hours}h ${minutes}m`;
  if (hours) return `${hours}h`;
  return `${minutes}m`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

function formatTrendBucket(bucket: string) {
  const date = new Date(bucket);
  if (Number.isNaN(date.getTime())) return bucket.slice(0, 10);
  return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date);
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <article className="rounded-lg border border-white/[.07] bg-white/[.015] px-4 py-4">
      <p className="font-mono text-[9px] uppercase tracking-[.16em] text-zinc-600">{label}</p>
      <p className="mt-3 font-mono text-xl tracking-tight text-zinc-200">{value}</p>
      {detail && <p className="mt-1 font-mono text-[9px] text-zinc-600">{detail}</p>}
    </article>
  );
}

export function StudyUnavailable({ reason = "Study data is unavailable right now." }: { reason?: string }) {
  return (
    <section className="rounded-lg border border-white/[.07] bg-white/[.015] px-5 py-12 text-center">
      <p className="font-mono text-[11px] text-zinc-400">{reason}</p>
      <p className="mx-auto mt-2 max-w-md font-mono text-[9px] leading-5 text-zinc-600">
        Your tracker session is kept on the server and is never sent to the browser.
      </p>
      <a href={TRACKER_URL} target="_blank" rel="noreferrer" className="mt-5 inline-flex font-mono text-[10px] text-violet-300 hover:text-violet-200">
        Open tracker ↗
      </a>
    </section>
  );
}

export function StudySummary({ summary }: { summary: StudySummary }) {
  const maxTrend = Math.max(...summary.weeklyTrend.map((item) => item.seconds), 1);
  const progress = summary.progress <= 1 ? summary.progress * 100 : summary.progress;
  const hallLeader = summary.hallOfFame[0];
  const ownHallEntry = summary.hallOfFame.find((entry) => entry.username.toLowerCase() === summary.username.toLowerCase());

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[.06] pb-4">
        <div>
          <p className="font-mono text-[10px] text-zinc-300">@{summary.username}</p>
          <p className="mt-1 font-mono text-[9px] text-zinc-600">
            Level {summary.level || "—"} · {formatNumber(summary.xp)} XP · {summary.badgeCount} badges
            {summary.timerRunning && <span className="ml-2 text-violet-300">· timer active</span>}
          </p>
        </div>
        <p className="font-mono text-[9px] text-zinc-700">Updated {formatUpdatedAt(summary.updatedAt)} · refreshes every 3h</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Today" value={formatDuration(summary.todaySeconds)} />
        <Stat label="This week" value={formatDuration(summary.weekSeconds)} />
        <Stat label="Lifetime" value={formatDuration(summary.lifetimeSeconds)} detail={`Level ${summary.level || "—"}`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(300px,.9fr)]">
        <section className="rounded-lg border border-white/[.07] bg-white/[.015] p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-mono text-[11px] text-zinc-300">Insights</h2>
            <span className="font-mono text-[9px] text-zinc-700">today · week</span>
          </div>

          <div className="mt-5">
            <p className="font-mono text-[9px] uppercase tracking-[.14em] text-zinc-600">Today by label</p>
            {summary.todayLabels.length ? (
              <div className="mt-3 space-y-3">
                {summary.todayLabels.map((item) => (
                  <div key={item.name}>
                    <div className="mb-1 flex items-center justify-between gap-3 font-mono text-[9px]">
                      <span className="flex min-w-0 items-center gap-2 truncate text-zinc-400"><i className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />{item.name}</span>
                      <span className="shrink-0 text-zinc-600">{formatDuration(item.seconds)}</span>
                    </div>
                    <div className="h-1 overflow-hidden rounded-full bg-white/[.05]"><div className="h-full rounded-full bg-violet-400/60" style={{ width: `${Math.max(3, (item.seconds / Math.max(summary.todaySeconds, 1)) * 100)}%` }} /></div>
                  </div>
                ))}
              </div>
            ) : <p className="mt-3 font-mono text-[10px] text-zinc-700">No labeled focus logged today.</p>}
          </div>

          <div className="mt-7">
            <p className="font-mono text-[9px] uppercase tracking-[.14em] text-zinc-600">Last 7 days</p>
            {summary.weeklyTrend.length ? (
              <div className="mt-3 grid grid-cols-7 items-end gap-2">
                {summary.weeklyTrend.map((item) => (
                  <div key={item.bucket} className="min-w-0 text-center">
                    <div className="mx-auto flex h-16 items-end justify-center"><div className="w-full max-w-5 rounded-t-sm bg-violet-400/55" style={{ height: `${Math.max(5, (item.seconds / maxTrend) * 100)}%` }} title={formatDuration(item.seconds)} /></div>
                    <p className="mt-2 truncate font-mono text-[8px] text-zinc-700">{formatTrendBucket(item.bucket)}</p>
                  </div>
                ))}
              </div>
            ) : <p className="mt-3 font-mono text-[10px] text-zinc-700">No weekly insight data yet.</p>}
          </div>
        </section>

        <section className="rounded-lg border border-white/[.07] bg-white/[.015] p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-mono text-[11px] text-zinc-300">Hall of Fame</h2>
            <span className="font-mono text-[9px] text-zinc-700">this week</span>
          </div>
          {summary.hallOfFame.length ? (
            <div className="mt-4 space-y-1">
              {summary.hallOfFame.map((entry) => (
                <div key={`${entry.rank}-${entry.username}`} className={`flex items-center gap-3 rounded-md px-3 py-2.5 font-mono text-[10px] ${entry.username.toLowerCase() === summary.username.toLowerCase() ? "bg-violet-400/[.08] text-violet-200" : "text-zinc-500"}`}>
                  <span className="w-5 text-zinc-700">#{entry.rank}</span>
                  <span className="min-w-0 flex-1 truncate">@{entry.username}</span>
                  <span className="text-zinc-600">{formatDuration(entry.seconds)}</span>
                </div>
              ))}
            </div>
          ) : <p className="mt-5 font-mono text-[10px] text-zinc-700">Hall of Fame data is unavailable.</p>}
          {ownHallEntry && !summary.hallOfFame.slice(0, 5).some((entry) => entry.username.toLowerCase() === summary.username.toLowerCase()) && <p className="mt-4 font-mono text-[9px] text-zinc-600">Your rank: #{ownHallEntry.rank} · {formatDuration(ownHallEntry.seconds)}</p>}
          {hallLeader && <p className="mt-5 border-t border-white/[.06] pt-4 font-mono text-[9px] text-zinc-700">Leading with {formatDuration(hallLeader.seconds)} logged.</p>}
        </section>
      </div>

      {summary.level > 0 && summary.xpToNext > 0 && <div className="rounded-lg border border-white/[.07] bg-white/[.015] px-5 py-4"><div className="flex items-center justify-between gap-3 font-mono text-[9px] text-zinc-600"><span>Next level</span><span>{formatNumber(summary.xpIntoLevel)} / {formatNumber(summary.xpIntoLevel + summary.xpToNext)} XP</span></div><div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[.05]"><div className="h-full rounded-full bg-violet-400/60" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} /></div></div>}
    </div>
  );
}
