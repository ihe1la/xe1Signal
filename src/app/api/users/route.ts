import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function positiveInteger(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() || "";
    const limit = Math.min(positiveInteger(searchParams.get("limit"), 50), 500);
    const where: Prisma.UserWhereInput = {
      isActive: true,
      isBanned: false,
      ...(query
        ? {
            OR: [
              { username: { contains: query } },
              { name: { contains: query } },
              { displayName: { contains: query } },
              { bio: { contains: query } },
            ],
          }
        : {}),
    };

    const users = await db.user.findMany({
      where,
      orderBy: [{ lastActiveAt: "desc" }, { createdAt: "desc" }],
      take: limit,
      select: {
        id: true,
        username: true,
        name: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        bannerUrl: true,
        createdAt: true,
        _count: {
          select: {
            followers: true,
            following: true,
            signals: {
              where: {
                visibility: "PUBLIC",
                isDeleted: false,
                isArchived: false,
                isDraft: false,
              },
            },
            frequencies: { where: { isArchived: false } },
          },
        },
        followers: userId
          ? { where: { followerId: userId }, select: { id: true } }
          : false,
      },
    });

    return NextResponse.json({
      users: users.map(({ followers, _count, ...user }) => ({
        ...user,
        name: user.displayName || user.name || user.username,
        followerCount: _count.followers,
        followingCount: _count.following,
        signalCount: _count.signals,
        frequencyCount: _count.frequencies,
        strength: _count.signals + _count.frequencies * 2,
        isFollowing: Array.isArray(followers) && followers.length > 0,
        isSelf: user.id === userId,
      })),
    });
  } catch (error) {
    console.error("GET /api/users error:", error);
    return NextResponse.json({ error: "Failed to fetch people" }, { status: 500 });
  }
}
