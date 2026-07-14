import { Prisma } from "@prisma/client";
import { GhostModeDuration, type GhostModeDuration as GhostModeDurationValue, SignalVisibility } from "@/lib/model-values";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const ghostModeSchema = z.union([
  z.nativeEnum(GhostModeDuration),
  z.literal("NONE"),
]);

const signalUpdateSchema = z.object({
  title: z.string().max(200).optional(),
  content: z.string().max(50000).optional(),
  description: z.string().max(2000).optional(),
  sourceUrl: z.string().url().optional().nullable(),
  frequencyId: z.string().trim().min(1).max(191).optional().nullable(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  visibility: z.nativeEnum(SignalVisibility).optional(),
  ghostMode: ghostModeSchema.optional(),
  ghostModeExpiresAt: z.string().datetime().optional().nullable(),
  selectedUserIds: z.array(z.string().cuid()).optional(),
  isDraft: z.boolean().optional(),
});

function normalizeTags(tags: string | string[] | undefined) {
  if (tags === undefined) return undefined;
  const values = typeof tags === "string" ? tags.split(",") : tags;
  return [
    ...new Set(values.map((tag) => tag.trim().toLowerCase()).filter(Boolean)),
  ].join(",");
}

function getGhostExpiry(
  mode: GhostModeDurationValue | "NONE" | undefined,
  customExpiry: string | null | undefined,
) {
  switch (mode) {
    case undefined:
      return undefined;
    case GhostModeDuration.ONE_HOUR:
      return new Date(Date.now() + 60 * 60 * 1000);
    case GhostModeDuration.ONE_DAY:
      return new Date(Date.now() + 24 * 60 * 60 * 1000);
    case GhostModeDuration.ONE_WEEK:
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    case GhostModeDuration.CUSTOM_DATE:
      return customExpiry ? new Date(customExpiry) : null;
    default:
      return null;
  }
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
    comments: {
      take: 20,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, name: true, username: true, avatarUrl: true },
        },
        replies: {
          take: 3,
          orderBy: { createdAt: "asc" },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        },
        _count: { select: { replies: true } },
      },
    },
  });

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const { id } = await params;

    const signal = await db.signal.findFirst({
      where: { id, isDeleted: false },
      include: signalInclude(userId),
    });

    if (!signal) {
      return NextResponse.json({ error: "Signal not found" }, { status: 404 });
    }

    let isCollaborator = false;
    if (
      userId &&
      signal.visibility === SignalVisibility.COLLABORATORS_ONLY &&
      signal.frequencyId
    ) {
      isCollaborator = Boolean(
        await db.frequencyCollaborator.findFirst({
          where: {
            frequencyId: signal.frequencyId,
            userId,
            acceptedAt: { not: null },
          },
          select: { id: true },
        }),
      );
    }

    const canView =
      signal.visibility === SignalVisibility.PUBLIC ||
      signal.visibility === SignalVisibility.UNLISTED ||
      signal.ownerId === userId ||
      (userId !== undefined && signal.selectedUserIds.split(",").includes(userId)) ||
      isCollaborator;

    if (!canView) {
      return NextResponse.json({ error: "Signal not found" }, { status: 404 });
    }

    if (
      signal.ghostMode !== GhostModeDuration.OPEN_ONCE &&
      signal.ghostModeExpiresAt &&
      signal.ghostModeExpiresAt <= new Date()
    ) {
      return NextResponse.json(
        { error: "Signal has expired" },
        { status: 410 },
      );
    }

    if (
      signal.ghostMode === GhostModeDuration.OPEN_ONCE &&
      signal.ownerId !== userId
    ) {
      if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const opened = await db.signal.updateMany({
        where: { id, ghostModeOpenedAt: null },
        data: { ghostModeOpenedAt: new Date(), ghostModeOpenedBy: userId },
      });
      if (opened.count !== 1) {
        return NextResponse.json(
          { error: "Signal has already been opened" },
          { status: 410 },
        );
      }
    }

    const { reactions, saves, ...responseSignal } = signal;
    return NextResponse.json({
      signal: {
        ...responseSignal,
        isReacted: reactions.length > 0,
        reactionType: reactions[0]?.type,
        isSaved: saves.length > 0,
      },
    });
  } catch (error) {
    console.error("GET /api/signals/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch signal" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const validated = signalUpdateSchema.parse(await req.json());
    if (
      validated.visibility === SignalVisibility.SELECTED_USERS &&
      validated.selectedUserIds?.length === 0
    ) {
      return NextResponse.json(
        { error: "At least one selected user is required" },
        { status: 400 },
      );
    }
    if (
      validated.ghostMode === GhostModeDuration.CUSTOM_DATE &&
      !validated.ghostModeExpiresAt
    ) {
      return NextResponse.json(
        { error: "A custom expiry date is required" },
        { status: 400 },
      );
    }

    const existingSignal = await db.signal.findUnique({
      where: { id },
      select: { ownerId: true, frequencyId: true },
    });
    if (!existingSignal) {
      return NextResponse.json({ error: "Signal not found" }, { status: 404 });
    }
    if (
      existingSignal.ownerId !== session.user.id &&
      session.user.role !== "ADMIN"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (validated.frequencyId) {
      const editableFrequency = await db.frequency.findFirst({
        where: {
          id: validated.frequencyId,
          OR: [
            { ownerId: session.user.id },
            {
              collaborators: {
                some: {
                  userId: session.user.id,
                  acceptedAt: { not: null },
                  role: { in: ["EDITOR", "ADMIN"] },
                },
              },
            },
          ],
        },
        select: { id: true },
      });
      if (!editableFrequency) {
        return NextResponse.json(
          { error: "Frequency not found or not editable" },
          { status: 404 },
        );
      }
    }

    const updatedSignal = await db.$transaction(async (transaction) => {
      const updated = await transaction.signal.update({
        where: { id },
        data: {
          title: validated.title,
          content: validated.content,
          description: validated.description,
          sourceUrl: validated.sourceUrl,
          frequencyId: validated.frequencyId,
          visibility: validated.visibility,
          ghostMode:
            validated.ghostMode === "NONE" ? null : validated.ghostMode,
          ghostModeExpiresAt: getGhostExpiry(
            validated.ghostMode,
            validated.ghostModeExpiresAt,
          ),
          ghostModeOpenedAt:
            validated.ghostMode === undefined ? undefined : null,
          ghostModeOpenedBy:
            validated.ghostMode === undefined ? undefined : null,
          selectedUserIds: validated.selectedUserIds?.join(","),
          tags: normalizeTags(validated.tags),
          isDraft: validated.isDraft,
        },
        include: signalInclude(session.user.id),
      });

      if (
        validated.frequencyId !== undefined &&
        existingSignal.frequencyId !== validated.frequencyId
      ) {
        if (existingSignal.frequencyId) {
          await transaction.frequency.updateMany({
            where: { id: existingSignal.frequencyId, signalCount: { gt: 0 } },
            data: { signalCount: { decrement: 1 } },
          });
        }
        if (validated.frequencyId) {
          await transaction.frequency.update({
            where: { id: validated.frequencyId },
            data: { signalCount: { increment: 1 } },
          });
        }
      }

      return updated;
    });

    const { reactions, saves, ...responseSignal } = updatedSignal;
    return NextResponse.json({
      success: true,
      signal: {
        ...responseSignal,
        isReacted: reactions.length > 0,
        reactionType: reactions[0]?.type,
        isSaved: saves.length > 0,
      },
    });
  } catch (error) {
    console.error("PATCH /api/signals/[id] error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Failed to update signal" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const signal = await db.signal.findUnique({
      where: { id },
      select: { ownerId: true, frequencyId: true },
    });
    if (!signal) {
      return NextResponse.json({ error: "Signal not found" }, { status: 404 });
    }
    if (signal.ownerId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.$transaction(async (transaction) => {
      await transaction.signal.delete({ where: { id } });
      if (signal.frequencyId) {
        await transaction.frequency.updateMany({
          where: { id: signal.frequencyId, signalCount: { gt: 0 } },
          data: { signalCount: { decrement: 1 } },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/signals/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete signal" },
      { status: 500 },
    );
  }
}
