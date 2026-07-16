import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { calculateSignalStrength } from "@/lib/user-metrics";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const [profile, frequencies, recentSignal, recentTrail] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: {
        username: true,
        name: true,
        displayName: true,
        avatarUrl: true,
        _count: {
          select: {
            signals: { where: { isDeleted: false, isArchived: false } },
            frequencies: { where: { isArchived: false } },
          },
        },
      },
    }),
    db.frequency.findMany({
      where: { ownerId: userId, isArchived: false },
      orderBy: { updatedAt: "desc" },
      take: 7,
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

  return NextResponse.json({
    profile: profile ? {
      username: profile.username,
      name: profile.displayName || profile.name || profile.username,
      avatarUrl: profile.avatarUrl,
      strength: calculateSignalStrength(profile._count.signals, profile._count.frequencies),
    } : null,
    activeFrequency: frequencies[0] || null,
    frequencies,
    recentSignal,
    recentTrail,
  });
}
