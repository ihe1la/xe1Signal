import type { StudySummary as TrackerStudySummary } from "@/lib/tracker-client";

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

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <article className="rounded-xl border border-white/[.07] bg-white/[.015] px-4 py-4 transition-colors hover:border-white/[.1]">
      <p className="font-mono text-[10px] uppercase tracking-[.16em] text-zinc-500">{label}</p>
      <p className="mt-3 font-sans text-2xl font-semibold tabular-nums tracking-tight text-zinc-100">{value}</p>
      {detail && <p className="mt-1 font-sans text-[11px] text-zinc-500">{detail}</p>}
    </article>
  );
}

export function StudyUnavailable({ reason = "Study data is unavailable right now." }: { reason?: string }) {
  return (
    <section className="rounded-xl border border-white/[.07] bg-white/[.015] px-5 py-12 text-center">
      <p className="font-sans text-sm text-zinc-300">{reason}</p>
      <p className="mx-auto mt-2 max-w-md font-sans text-xs leading-5 text-zinc-500">
        Your tracker session is kept on the server and is never sent to the browser.
      </p>
    </section>
  );
}

export function StudySummary({ summary }: { summary: TrackerStudySummary }) {
  const progress = summary.progress <= 1 ? summary.progress * 100 : summary.progress;
  const hallLeader = summary.hallOfFame[0];
  const ownHallEntry = summary.hallOfFame.find((entry) => entry.username.toLowerCase() === summary.username.toLowerCase());

  return (
    <div className="mt-5 space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Today" value={formatDuration(summary.todaySeconds)} detail={summary.timerRunning ? "Timer currently active" : "Ready when you are"} />
        <Stat label="This week" value={formatDuration(summary.weekSeconds)} detail="Across your focus sessions" />
        <Stat label="Lifetime" value={formatDuration(summary.lifetimeSeconds)} detail={`Level ${summary.level || "—"} · ${summary.badgeCount} badges`} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(300px,.92fr)]">
        <section className="rounded-xl border border-white/[.07] bg-white/[.015] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-sans text-sm font-medium text-zinc-200">Insights</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[.14em] text-zinc-600">where your focus went today</p>
            </div>
            <span className="font-mono text-[10px] text-zinc-600">@{summary.username}</span>
          </div>

          <div className="mt-6">
            <p className="font-mono text-[10px] uppercase tracking-[.14em] text-zinc-500">Today by label</p>
            {summary.todayLabels.length ? (
              <div className="mt-4 space-y-4">
                {summary.todayLabels.map((item) => (
                  <div key={item.name}>
                    <div className="mb-1.5 flex items-center justify-between gap-3 font-sans text-xs">
                      <span className="flex min-w-0 items-center gap-2 truncate text-zinc-300"><i className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: item.color || "#8f7be9" }} />{item.name}</span>
                      <span className="shrink-0 tabular-nums text-zinc-500">{formatDuration(item.seconds)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/[.05]"><div className="h-full rounded-full" style={{ width: `${Math.max(3, (item.seconds / Math.max(summary.todaySeconds, 1)) * 100)}%`, backgroundColor: item.color || "#8f7be9", opacity: 0.72 }} /></div>
                  </div>
                ))}
              </div>
            ) : <p className="mt-4 font-sans text-xs text-zinc-500">No labeled focus logged today.</p>}
          </div>

          <div className="mt-8 border-t border-white/[.06] pt-5">
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-[10px] uppercase tracking-[.14em] text-zinc-500">Sync details</p>
              <span className="font-sans text-[11px] text-zinc-600">refreshes every 3h</span>
            </div>
            <p className="mt-3 font-sans text-xs leading-5 text-zinc-500">Summary data last updated {formatUpdatedAt(summary.updatedAt)}. Timer controls stay live and can be refreshed from the focus panel.</p>
          </div>
        </section>

        <section className="rounded-xl border border-white/[.07] bg-white/[.015] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-sans text-sm font-medium text-zinc-200">Hall of Fame</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[.14em] text-zinc-600">this week</p>
            </div>
            {hallLeader && <span className="font-mono text-[10px] text-violet-300/70">#1 {hallLeader.username}</span>}
          </div>
          {summary.hallOfFame.length ? (
            <div className="mt-5 space-y-1">
              {summary.hallOfFame.map((entry) => (
                <div key={`${entry.rank}-${entry.username}`} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 font-sans text-xs ${entry.username.toLowerCase() === summary.username.toLowerCase() ? "bg-violet-400/[.08] text-violet-200" : "text-zinc-400"}`}>
                  <span className="w-5 font-mono text-[10px] text-zinc-600">#{entry.rank}</span>
                  <span className="min-w-0 flex-1 truncate">@{entry.username}</span>
                  <span className="tabular-nums text-zinc-500">{formatDuration(entry.seconds)}</span>
                </div>
              ))}
            </div>
          ) : <p className="mt-5 font-sans text-xs text-zinc-500">Hall of Fame data is unavailable.</p>}
          {ownHallEntry && !summary.hallOfFame.slice(0, 5).some((entry) => entry.username.toLowerCase() === summary.username.toLowerCase()) && <p className="mt-4 font-sans text-[11px] text-zinc-500">Your rank: #{ownHallEntry.rank} · {formatDuration(ownHallEntry.seconds)}</p>}
          {hallLeader && <p className="mt-5 border-t border-white/[.06] pt-4 font-sans text-[11px] text-zinc-500">Leading with {formatDuration(hallLeader.seconds)} logged.</p>}
        </section>
      </div>

      {summary.level > 0 && summary.xpToNext > 0 && <section className="rounded-xl border border-white/[.07] bg-white/[.015] px-5 py-4"><div className="flex items-center justify-between gap-3 font-sans text-xs text-zinc-500"><span>Next level</span><span className="tabular-nums">{formatNumber(summary.xpIntoLevel)} / {formatNumber(summary.xpIntoLevel + summary.xpToNext)} XP</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[.05]"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-300" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} /></div></section>}
    </div>
  );
}
