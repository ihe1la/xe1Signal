import { Prisma } from "@prisma/client";
import { FrequencyVisibility } from "@/lib/model-values";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const frequencyCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(2000).optional(),
  coverImageUrl: z.string().url().optional().nullable(),
  visibility: z.nativeEnum(FrequencyVisibility).optional(),
  isPublic: z.boolean().optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
});

function parsePositiveInteger(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeTags(tags: string | string[] | undefined) {
  const values = typeof tags === "string" ? tags.split(",") : (tags ?? []);
  return [
    ...new Set(values.map((tag) => tag.trim().toLowerCase()).filter(Boolean)),
  ].join(",");
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim() ?? "";
    const page = parsePositiveInteger(searchParams.get("page"), 1);
    const limit = Math.min(
      parsePositiveInteger(searchParams.get("limit"), 20),
      50,
    );
    const skip = (page - 1) * limit;

    const accessFilter: Prisma.FrequencyWhereInput = userId
      ? {
          OR: [
            { visibility: FrequencyVisibility.PUBLIC },
            { ownerId: userId },
            {
              collaborators: {
                some: { userId, acceptedAt: { not: null } },
              },
            },
          ],
        }
      : { visibility: FrequencyVisibility.PUBLIC };
    const where: Prisma.FrequencyWhereInput = {
      AND: [
        { isArchived: false },
        accessFilter,
        query
          ? {
              OR: [
                { name: { contains: query } },
                { description: { contains: query } },
                { tags: { contains: query.toLowerCase() } },
              ],
            }
          : {},
      ],
    };

    const [frequencies, total] = await Promise.all([
      db.frequency.findMany({
        where,
        orderBy: [{ signalCount: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
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
          followers: userId
            ? { where: { userId }, select: { id: true } }
            : false,
        },
      }),
      db.frequency.count({ where }),
    ]);

    return NextResponse.json({
      frequencies: frequencies.map(
        ({ collaborators, followers, ...frequency }) => ({
          ...frequency,
          isOwner: frequency.ownerId === userId,
          isFollowing: followers.length > 0,
          memberRole:
            frequency.ownerId === userId ? "ADMIN" : collaborators[0]?.role,
        }),
      ),
      total,
      page,
      limit,
      hasMore: skip + limit < total,
    });
  } catch (error) {
    console.error("GET /api/frequencies error:", error);
    return NextResponse.json(
      { error: "Failed to fetch frequencies" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const validated = frequencyCreateSchema.parse(await req.json());
    const visibility =
      validated.visibility ??
      (validated.isPublic === false
        ? FrequencyVisibility.PRIVATE
        : FrequencyVisibility.PUBLIC);

    const frequency = await db.frequency.create({
      data: {
        name: validated.name,
        description: validated.description,
        coverImageUrl: validated.coverImageUrl,
        visibility,
        ownerId: session.user.id,
        tags: normalizeTags(validated.tags),
      },
      include: {
        owner: {
          select: { id: true, name: true, username: true, avatarUrl: true },
        },
      },
    });

    return NextResponse.json({ success: true, frequency }, { status: 201 });
  } catch (error) {
    console.error("POST /api/frequencies error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Failed to create frequency" },
      { status: 500 },
    );
  }
}
