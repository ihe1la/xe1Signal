import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { vibeControlSchema } from "@/lib/vibe";
import { applyVibeControl } from "@/lib/vibe-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = vibeControlSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid vibe control" }, { status: 400 });
  return NextResponse.json(await applyVibeControl(parsed.data.action, parsed.data.itemId));
}
