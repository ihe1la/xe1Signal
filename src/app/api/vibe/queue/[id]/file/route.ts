import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUnstreamTrackFile } from "@/lib/unstream-client";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const item = await db.vibeQueueItem.findFirst({
    where: { id, room: { slug: "main" } },
    select: { unstreamJobId: true, unstreamTrackId: true, status: true },
  });
  if (!item || !["ready", "playing"].includes(item.status) || !item.unstreamJobId || !item.unstreamTrackId) {
    return NextResponse.json({ error: "Vibe track is not ready" }, { status: 404 });
  }

  let upstream: Response;
  try {
    upstream = await getUnstreamTrackFile(item.unstreamJobId, item.unstreamTrackId, request.headers.get("range"));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unstream is unavailable" }, { status: 502 });
  }
  if (!upstream.ok) return NextResponse.json({ error: "Vibe track is not available" }, { status: upstream.status === 404 ? 404 : 502 });
  const headers = new Headers();
  for (const name of ["accept-ranges", "content-length", "content-range", "content-type"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("cache-control", "private, no-store");
  headers.set("content-disposition", "inline");
  headers.set("x-content-type-options", "nosniff");
  return new Response(upstream.body, { status: upstream.status, headers });
}
