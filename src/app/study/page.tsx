import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { StudySummary, StudyUnavailable } from "@/components/study-summary";
import { getTrackerStudySummary, getTrackerStudyWorkspace, trackerUsernameMatches } from "@/lib/tracker-client";
import { StudyWorkspace } from "@/components/study-workspace";
import { canAccessOwnerTools } from "@/lib/owner-access";

export const metadata: Metadata = { title: "Study" };

export default async function StudyPage() {
  const session = await auth();
  const username = session?.user?.username;
  if (!canAccessOwnerTools(username)) notFound();

  const linked = trackerUsernameMatches(username);
  const [summary, workspace] = linked
    ? await Promise.all([getTrackerStudySummary(), getTrackerStudyWorkspace()])
    : [null, null];

  return (
    <AppLayout>
      <div className="mx-auto max-w-[1300px]">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="font-sans text-3xl font-semibold tracking-tight text-zinc-100 sm:text-[34px]">Study</h1>
            {workspace && <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/15 bg-emerald-300/[.06] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[.14em] text-emerald-200/80"><i className="h-1.5 w-1.5 rounded-full bg-emerald-300" />Connected</span>}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            {summary && <p className="font-mono text-[10px] text-zinc-600">updated {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(summary.updatedAt))}</p>}
            <span className="font-mono text-[10px] text-zinc-600">source: <a href="https://tracker.l30on.top/" target="_blank" rel="noreferrer" className="text-zinc-500 transition hover:text-violet-300">tracker.l30on.top</a></span>
            <a href="https://tracker.l30on.top/" target="_blank" rel="noreferrer" className="font-sans text-xs text-zinc-400 transition hover:text-violet-200">Open original ↗</a>
          </div>
        </header>
        {!linked ? (
          <StudyUnavailable reason="This xe1Signal profile is not linked to the tracker profile." />
        ) : workspace ? (
          <>
            <StudyWorkspace initialWorkspace={workspace} />
            {summary && <StudySummary summary={summary} />}
          </>
        ) : (
          <StudyUnavailable reason="Study data is unavailable right now." />
        )}
      </div>
    </AppLayout>
  );
}
