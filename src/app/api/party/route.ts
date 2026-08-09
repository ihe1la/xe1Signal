import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { ensureMainPartyRoom, getPartySnapshot, syncActivePartyJobs } from "@/lib/party-server";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const room = await ensureMainPartyRoom();
  await syncActivePartyJobs(room.id);
  return NextResponse.json(await getPartySnapshot(room.id));
}
