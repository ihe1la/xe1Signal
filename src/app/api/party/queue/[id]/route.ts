import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { deletePartyQueueItem } from "@/lib/party-server";

export const runtime = "nodejs";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const snapshot = await deletePartyQueueItem(id);
  if (!snapshot) return NextResponse.json({ error: "Party item not found" }, { status: 404 });
  return NextResponse.json(snapshot);
}
