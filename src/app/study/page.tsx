import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import { StudySummary, StudyUnavailable } from "@/components/study-summary";
import { getTrackerStudySummary, trackerUsernameMatches } from "@/lib/tracker-client";

export const metadata: Metadata = { title: "Study" };

const TRACKER_URL = "https://tracker.l30on.top/";

export default async function StudyPage() {
  const session = await auth();
  const username = session?.user?.username;
  const linked = trackerUsernameMatches(username);
  const summary = linked ? await getTrackerStudySummary() : null;

  return (
    <AppLayout showRightSidebar={false}>
      <div className="mx-auto max-w-[1300px]">
        <header className="mb-6 flex items-center justify-between gap-4">
          <h1 className="font-mono text-2xl tracking-tight text-zinc-100 sm:text-[30px]">Study</h1>
          <a href={TRACKER_URL} target="_blank" rel="noreferrer" className="shrink-0 font-mono text-[10px] text-zinc-500 transition hover:text-zinc-200">
            Open original ↗
          </a>
        </header>
        {!username ? (
          <StudyUnavailable reason="Sign in to xe1Signal to view your tracker profile." />
        ) : !linked ? (
          <StudyUnavailable reason="This xe1Signal profile is not linked to the tracker profile." />
        ) : summary ? (
          <StudySummary summary={summary} />
        ) : (
          <StudyUnavailable reason="Study data is unavailable right now." />
        )}
      </div>
    </AppLayout>
  );
}
