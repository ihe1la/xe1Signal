import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { ensureMainVibeRoom, getVibeSnapshot, syncActiveVibeJobs } from "@/lib/vibe-server";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const room = await ensureMainVibeRoom();
  await syncActiveVibeJobs(room.id);
  return NextResponse.json(await getVibeSnapshot(room.id));
}
