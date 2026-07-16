import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const [profile, activeFrequency, recentSignal, recentTrail] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { username: true, avatarUrl: true },
    }),
    db.frequency.findFirst({
      where: { ownerId: userId, isArchived: false },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, signalCount: true },
    }),
    db.signal.findFirst({
      where: { ownerId: userId, isDeleted: false, isArchived: false },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, previewImageUrl: true, createdAt: true },
    }),
    db.researchTrail.findFirst({
      where: { ownerId: userId, isArchived: false },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        nodeCount: true,
        nodes: { orderBy: { order: "asc" }, take: 6, select: { id: true, title: true } },
      },
    }),
  ]);

  return NextResponse.json({ profile, activeFrequency, recentSignal, recentTrail });
}
