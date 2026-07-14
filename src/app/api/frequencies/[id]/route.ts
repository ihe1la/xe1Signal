import { CollaboratorRole, FrequencyVisibility } from "@/lib/model-values";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const frequencyUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(2000).optional().nullable(),
  coverImageUrl: z.string().url().optional().nullable(),
  coverImage: z.string().url().optional().nullable(),
  visibility: z.nativeEnum(FrequencyVisibility).optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
});

function normalizeTags(tags: string | string[] | undefined) {
  if (tags === undefined) return undefined;
  const values = typeof tags === "string" ? tags.split(",") : tags;
  return [
    ...new Set(values.map((tag) => tag.trim().toLowerCase()).filter(Boolean)),
  ].join(",");
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const { id } = await params;

    const frequency = await db.frequency.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, name: true, username: true, avatarUrl: true },
        },
        _count: {
          select: { signals: true, collaborators: true, followers: true },
        },
        collaborators: userId
          ? {
              where: { userId, acceptedAt: { not: null } },
              select: { role: true },
            }
          : false,
        followers: userId ? { where: { userId }, select: { id: true } } : false,
      },
    });

    if (!frequency) {
      return NextResponse.json(
        { error: "Frequency not found" },
        { status: 404 },
      );
    }

    const canView =
      frequency.visibility === FrequencyVisibility.PUBLIC ||
      frequency.ownerId === userId ||
      frequency.collaborators.length > 0;
    if (!canView) {
      return NextResponse.json(
        { error: "Frequency not found" },
        { status: 404 },
      );
    }

    const { collaborators, followers, ...responseFrequency } = frequency;
    return NextResponse.json({
      frequency: {
        ...responseFrequency,
        userRole:
          frequency.ownerId === userId
            ? CollaboratorRole.ADMIN
            : collaborators[0]?.role,
        isFollowing: followers.length > 0,
      },
    });
  } catch (error) {
    console.error("GET /api/frequencies/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch frequency" },
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
    const validated = frequencyUpdateSchema.parse(await req.json());
    const coverImageUrl =
      validated.coverImageUrl !== undefined
        ? validated.coverImageUrl
        : validated.coverImage;
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

    const updated = await db.frequency.update({
      where: { id },
      data: {
        name: validated.name,
        description: validated.description,
        ...(coverImageUrl !== undefined ? { coverImageUrl } : {}),
        visibility: validated.visibility,
        tags: normalizeTags(validated.tags),
      },
      include: {
        owner: {
          select: { id: true, name: true, username: true, avatarUrl: true },
        },
        _count: {
          select: { signals: true, collaborators: true, followers: true },
        },
      },
    });

    return NextResponse.json({ success: true, frequency: updated });
  } catch (error) {
    console.error("PATCH /api/frequencies/[id] error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Failed to update frequency" },
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
    const frequency = await db.frequency.findUnique({
      where: { id },
      select: { ownerId: true },
    });
    if (!frequency) {
      return NextResponse.json(
        { error: "Frequency not found" },
        { status: 404 },
      );
    }
    if (
      frequency.ownerId !== session.user.id &&
      session.user.role !== "ADMIN"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.frequency.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/frequencies/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete frequency" },
      { status: 500 },
    );
  }
}
