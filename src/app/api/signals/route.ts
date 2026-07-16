import { Prisma } from "@prisma/client";
import {
  GhostModeDuration,
  type GhostModeDuration as GhostModeDurationValue,
  SignalType,
  SignalVisibility,
} from "@/lib/model-values";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  isAllowedMediaThumbnail,
  mediaIdentityMatches,
  parseMediaUrl,
} from "@/lib/media/parse-media-url";

const ghostModeSchema = z.union([
  z.nativeEnum(GhostModeDuration),
  z.literal("NONE"),
]);

const signalCreateSchema = z
  .object({
    type: z.nativeEnum(SignalType),
    title: z.string().max(200).optional(),
    content: z.string().max(50000).optional(),
    description: z.string().max(2000).optional(),
    sourceUrl: z.string().url().optional().nullable(),
    mediaProvider: z
      .enum(["youtube", "spotify", "audius"])
      .optional()
      .nullable(),
    mediaEntityType: z.string().max(30).optional().nullable(),
    externalId: z.string().max(100).optional().nullable(),
    providerUri: z.string().max(200).optional().nullable(),
    creatorName: z.string().max(300).optional().nullable(),
    thumbnailUrl: z.string().url().max(2048).optional().nullable(),
    durationMs: z
      .number()
      .int()
      .nonnegative()
      .max(86_400_000)
      .optional()
      .nullable(),
    frequencyId: z.string().trim().min(1).max(191).optional().nullable(),
    tags: z.union([z.string(), z.array(z.string())]).optional(),
    visibility: z.nativeEnum(SignalVisibility).default("PUBLIC"),
    ghostMode: ghostModeSchema.default("NONE"),
    ghostModeExpiresAt: z.string().datetime().optional().nullable(),
    selectedUserIds: z.array(z.string().cuid()).default([]),
    isDraft: z.boolean().default(false),
  })
  .superRefine((value, context) => {
    if (
      value.visibility === SignalVisibility.SELECTED_USERS &&
      value.selectedUserIds.length === 0
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["selectedUserIds"],
        message: "At least one selected user is required",
      });
    }

    if (
      value.ghostMode === GhostModeDuration.CUSTOM_DATE &&
      !value.ghostModeExpiresAt
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ghostModeExpiresAt"],
        message: "A custom expiry date is required",
      });
    }
    if (value.mediaProvider) {
      const media = value.sourceUrl ? parseMediaUrl(value.sourceUrl) : null;
      if (
        !mediaIdentityMatches(
          media,
          value.mediaProvider,
          value.mediaEntityType,
          value.externalId,
        )
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["sourceUrl"],
          message: "Media details do not match the provider URL",
        });
      }
      if (
        value.thumbnailUrl &&
        !isAllowedMediaThumbnail(value.thumbnailUrl, value.mediaProvider)
      )
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["thumbnailUrl"],
          message: "Thumbnail must come from the selected provider",
        });
    } else if (
      value.externalId ||
      value.mediaEntityType ||
      value.providerUri ||
      value.creatorName ||
      value.thumbnailUrl ||
      value.durationMs
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["mediaProvider"],
        message: "A media provider is required for provider metadata",
      });
    }
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

function getGhostExpiry(
  mode: GhostModeDurationValue | "NONE",
  customExpiry: string | null | undefined,
) {
  switch (mode) {
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
  });

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const { searchParams } = new URL(req.url);

    const query = searchParams.get("q")?.trim() ?? "";
    const rawType = searchParams.get("type");
    const parsedType = rawType
      ? z.nativeEnum(SignalType).safeParse(rawType)
      : null;
    if (parsedType && !parsedType.success) {
      return NextResponse.json(
        { error: "Invalid signal type" },
        { status: 400 },
      );
    }

    const sort = searchParams.get("sort") ?? "latest";
    const page = parsePositiveInteger(searchParams.get("page"), 1);
    const limit = Math.min(
      parsePositiveInteger(searchParams.get("limit"), 20),
      50,
    );
    const frequencyId = searchParams.get("frequencyId") || undefined;
    const authorId = searchParams.get("authorId") || undefined;
    const publicOnly = searchParams.get("scope") === "public";
    const includeDrafts =
      searchParams.get("includeDrafts") === "true" && authorId === userId;
    const skip = (page - 1) * limit;

    const filters: Prisma.SignalWhereInput[] = [
      { isDeleted: false, isArchived: false },
      includeDrafts ? {} : { isDraft: false },
      userId && !publicOnly
        ? { OR: [{ visibility: SignalVisibility.PUBLIC }, { ownerId: userId }] }
        : { visibility: SignalVisibility.PUBLIC },
    ];

    if (query) {
      filters.push({
        OR: [
          { title: { contains: query } },
          { content: { contains: query } },
          { description: { contains: query } },
          { tags: { contains: query.toLowerCase() } },
        ],
      });
    }
    if (parsedType?.success) filters.push({ type: parsedType.data });
    if (frequencyId) filters.push({ frequencyId });
    if (authorId) filters.push({ ownerId: authorId });

    const where: Prisma.SignalWhereInput = { AND: filters };
    let orderBy: Prisma.SignalOrderByWithRelationInput = { createdAt: "desc" };
    if (sort === "oldest") orderBy = { createdAt: "asc" };
    else if (sort === "popular" || sort === "strength") {
      orderBy = { signalStrength: "desc" };
    } else if (sort === "reactions") orderBy = { reactionCount: "desc" };
    else if (sort === "comments") orderBy = { commentCount: "desc" };

    const [signals, total] = await Promise.all([
      db.signal.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: signalInclude(userId),
      }),
      db.signal.count({ where }),
    ]);

    return NextResponse.json({
      signals: signals.map(({ reactions, saves, ...signal }) => ({
        ...signal,
        isReacted: Boolean(reactions && reactions.length > 0),
        reactionType: reactions && reactions[0]?.type,
        isSaved: Boolean(saves && saves.length > 0),
      })),
      total,
      page,
      limit,
      hasMore: skip + limit < total,
    });
  } catch (error) {
    console.error("GET /api/signals error:", error);
    return NextResponse.json(
      { error: "Failed to fetch signals" },
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

    const validated = signalCreateSchema.parse(await req.json());
    const parsedMedia =
      validated.mediaProvider && validated.sourceUrl
        ? parseMediaUrl(validated.sourceUrl)
        : null;

    if (validated.frequencyId) {
      const frequency = await db.frequency.findFirst({
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

      if (!frequency) {
        return NextResponse.json(
          { error: "Frequency not found or not editable" },
          { status: 404 },
        );
      }
    }

    const signal = await db.$transaction(async (transaction) => {
      const created = await transaction.signal.create({
        data: {
          type: validated.type,
          title: validated.title,
          content: validated.content,
          description: validated.description,
          sourceUrl: parsedMedia?.canonicalUrl || validated.sourceUrl,
          sourceDomain:
            validated.mediaProvider === "youtube"
              ? "youtube.com"
              : validated.mediaProvider === "spotify"
                ? "open.spotify.com"
                : validated.mediaProvider === "audius"
                  ? "audius.co"
                  : undefined,
          mediaProvider: validated.mediaProvider,
          mediaEntityType: validated.mediaEntityType,
          externalId: validated.externalId,
          providerUri:
            parsedMedia?.provider === "spotify" ? parsedMedia.spotifyUri : null,
          creatorName: validated.creatorName,
          thumbnailUrl: validated.thumbnailUrl,
          previewImageUrl: validated.thumbnailUrl,
          durationMs: validated.durationMs,
          metadataJson: validated.mediaProvider
            ? JSON.stringify({
                provider: validated.mediaProvider,
                entityType: validated.mediaEntityType,
                externalId: validated.externalId,
              })
            : undefined,
          frequencyId: validated.frequencyId,
          visibility: validated.visibility,
          ghostMode:
            validated.ghostMode === "NONE" ? null : validated.ghostMode,
          ghostModeExpiresAt: getGhostExpiry(
            validated.ghostMode,
            validated.ghostModeExpiresAt,
          ),
          selectedUserIds: validated.selectedUserIds.join(","),
          ownerId: session.user.id,
          tags: normalizeTags(validated.tags),
          isDraft: validated.isDraft,
        },
        include: signalInclude(session.user.id),
      });

      if (validated.frequencyId) {
        await transaction.frequency.update({
          where: { id: validated.frequencyId },
          data: { signalCount: { increment: 1 } },
        });
      }

      return created;
    });

    return NextResponse.json({ success: true, signal }, { status: 201 });
  } catch (error) {
    console.error("POST /api/signals error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Failed to create signal" },
      { status: 500 },
    );
  }
}
