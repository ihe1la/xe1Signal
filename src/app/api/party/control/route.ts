import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { partyControlSchema } from "@/lib/party";
import { applyPartyControl } from "@/lib/party-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = partyControlSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid party control" }, { status: 400 });
  return NextResponse.json(await applyPartyControl(parsed.data.action, parsed.data.itemId));
}
