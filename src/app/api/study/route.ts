import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTrackerStudyWorkspace, trackerUsernameMatches } from "@/lib/tracker-client";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!trackerUsernameMatches(session.user.username)) return NextResponse.json({ error: "Study tracker is not linked" }, { status: 403 });

  const workspace = await getTrackerStudyWorkspace();
  return workspace
    ? NextResponse.json(workspace)
    : NextResponse.json({ error: "Study data is unavailable right now" }, { status: 503 });
}
