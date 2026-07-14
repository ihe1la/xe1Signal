import { Prisma } from "@prisma/client";
import { CollaboratorRole, FrequencyVisibility, SignalVisibility } from "@/lib/model-values";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const signalIdSchema = z.object({ signalId: z.string().cuid() });

function parsePositiveInteger(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

const signalInclude = (userId?: string) =>
  Prisma.validator<Prisma.SignalInclude>()({
    owner: {
      select: { id: true, name: true, username: true, avatarUrl: true },
    },
    frequency: { select: { id: true, name: true } },
    files: {
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        url: true,
        mimeType: true,
        filename: true,
        originalName: true,
        thumbnailUrl: true,
        width: true,
        height: true,
        duration: true,
        size: true,
      },
    },
    _count: { select: { reactions: true, comments: true, saves: true } },
    reactions: userId ? { where: { userId }, select: { type: true } } : false,
    saves: userId ? { where: { userId }, select: { id: true } } : false,
  });

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const page = parsePositiveInteger(searchParams.get("page"), 1);
    const limit = Math.min(
      parsePositiveInteger(searchParams.get("limit"), 20),
      50,
    );
    const skip = (page - 1) * limit;

    const frequency = await db.frequency.findUnique({
      where: { id },
      select: {
        visibility: true,
        ownerId: true,
        collaborators: userId
          ? {
              where: { userId, acceptedAt: { not: null } },
              select: { id: true },
            }
          : false,
      },
    });
    if (!frequency) {
      return NextResponse.json(
        { error: "Frequency not found" },
        { status: 404 },
      );
    }

    const isOwner = frequency.ownerId === userId;
    const isCollaborator = frequency.collaborators.length > 0;
    const canViewFrequency =
      frequency.visibility === FrequencyVisibility.PUBLIC ||
      isOwner ||
      isCollaborator;
    if (!canViewFrequency) {
      return NextResponse.json(
        { error: "Frequency not found" },
        { status: 404 },
      );
    }

    const signalAccess: Prisma.SignalWhereInput = isOwner
      ? {}
      : userId
        ? {
            OR: [
              { visibility: SignalVisibility.PUBLIC },
              { visibility: SignalVisibility.UNLISTED },
              { ownerId: userId },
              {
                visibility: SignalVisibility.SELECTED_USERS,
                selectedUserIds: { contains: userId },
              },
              ...(isCollaborator
                ? [{ visibility: SignalVisibility.COLLABORATORS_ONLY }]
                : []),
            ],
          }
        : { visibility: SignalVisibility.PUBLIC };
    const where: Prisma.SignalWhereInput = {
      AND: [
        { frequencyId: id, isDeleted: false, isArchived: false },
        signalAccess,
      ],
    };

    const [signals, total] = await Promise.all([
      db.signal.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: signalInclude(userId),
      }),
      db.signal.count({ where }),
    ]);

    return NextResponse.json({
      signals: signals.map(({ reactions, saves, ...signal }) => ({
        ...signal,
        isReacted: reactions.length > 0,
        reactionType: reactions[0]?.type,
        isSaved: saves.length > 0,
      })),
      total,
      page,
      limit,
      hasMore: skip + limit < total,
    });
  } catch (error) {
    console.error("GET /api/frequencies/[id]/signals error:", error);
    return NextResponse.json(
      { error: "Failed to fetch signals" },
      { status: 500 },
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { signalId } = signalIdSchema.parse(await req.json());
    const frequency = await db.frequency.findUnique({
      where: { id },
      select: {
        ownerId: true,
        collaborators: {
          where: { userId: session.user.id, acceptedAt: { not: null } },
          select: { role: true },
        },
      },
    });
    if (!frequency) {
      return NextResponse.json(
        { error: "Frequency not found" },
        { status: 404 },
      );
    }

    const collaborator = frequency.collaborators[0];
    const canEdit =
      frequency.ownerId === session.user.id ||
      collaborator?.role === CollaboratorRole.EDITOR ||
      collaborator?.role === CollaboratorRole.ADMIN;
    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const signal = await db.signal.findFirst({
      where: {
        id: signalId,
        isDeleted: false,
        ownerId: session.user.id,
      },
      select: { frequencyId: true },
    });
    if (!signal) {
      return NextResponse.json({ error: "Signal not found" }, { status: 404 });
    }
    if (signal.frequencyId === id) {
      return NextResponse.json(
        { error: "Signal already in frequency" },
        { status: 400 },
      );
    }

    await db.$transaction(async (transaction) => {
      await transaction.signal.update({
        where: { id: signalId },
        data: { frequencyId: id },
      });
      if (signal.frequencyId) {
        await transaction.frequency.updateMany({
          where: { id: signal.frequencyId, signalCount: { gt: 0 } },
          data: { signalCount: { decrement: 1 } },
        });
      }
      await transaction.frequency.update({
        where: { id },
        data: { signalCount: { increment: 1 } },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/frequencies/[id]/signals error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Failed to add signal" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const parsed = signalIdSchema.safeParse({
      signalId: searchParams.get("signalId"),
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "A valid signalId is required" },
        { status: 400 },
      );
    }

    const frequency = await db.frequency.findUnique({
      where: { id },
      select: {
        ownerId: true,
        collaborators: {
          where: { userId: session.user.id, acceptedAt: { not: null } },
          select: { role: true },
        },
      },
    });
    if (!frequency) {
      return NextResponse.json(
        { error: "Frequency not found" },
        { status: 404 },
      );
    }

    const collaborator = frequency.collaborators[0];
    const canEdit =
      frequency.ownerId === session.user.id ||
      collaborator?.role === CollaboratorRole.EDITOR ||
      collaborator?.role === CollaboratorRole.ADMIN;
    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const signal = await db.signal.findFirst({
      where: { id: parsed.data.signalId, frequencyId: id },
      select: { ownerId: true },
    });
    if (!signal) {
      return NextResponse.json({ error: "Signal not found" }, { status: 404 });
    }
    if (signal.ownerId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.$transaction([
      db.signal.update({
        where: { id: parsed.data.signalId },
        data: { frequencyId: null },
      }),
      db.frequency.updateMany({
        where: { id, signalCount: { gt: 0 } },
        data: { signalCount: { decrement: 1 } },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/frequencies/[id]/signals error:", error);
    return NextResponse.json(
      { error: "Failed to remove signal" },
      { status: 500 },
    );
  }
}
