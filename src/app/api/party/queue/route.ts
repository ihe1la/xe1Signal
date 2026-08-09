import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { assertPartySourceUrl, partyQualitySchema, partySourceSchema } from "@/lib/party";
import { enqueuePartyUrl, ensureMainPartyRoom } from "@/lib/party-server";
import { UnstreamError } from "@/lib/unstream-client";

export const runtime = "nodejs";

const queueSchema = z.object({
  url: partySourceSchema,
  quality: partyQualitySchema.optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = queueSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Paste a valid YouTube, Spotify, or SoundCloud link" }, { status: 400 });

  let sourceUrl: string;
  try {
    sourceUrl = assertPartySourceUrl(parsed.data.url);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unsupported party link" }, { status: 400 });
  }

  const room = await ensureMainPartyRoom();
  try {
    const snapshot = await enqueuePartyUrl({ roomId: room.id, userId: session.user.id, sourceUrl, quality: parsed.data.quality });
    return NextResponse.json(snapshot, { status: 201 });
  } catch (error) {
    const status = error instanceof UnstreamError ? 422 : error instanceof Error && error.message.includes("UNSTREAM_API_URL") ? 503 : 502;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Party audio could not be prepared" }, { status });
  }
}
