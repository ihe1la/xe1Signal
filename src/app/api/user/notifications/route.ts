import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const settingsSelect = {
  emailNotifications: true,
  pushNotifications: true,
  signalReactions: true,
  signalComments: true,
  newFollowers: true,
  frequencyUpdates: true,
  trailUpdates: true,
  mentions: true,
  weeklyDigest: true,
} as const;

const schema = z.object({
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  signalReactions: z.boolean(),
  signalComments: z.boolean(),
  newFollowers: z.boolean(),
  frequencyUpdates: z.boolean(),
  trailUpdates: z.boolean(),
  mentions: z.boolean(),
  weeklyDigest: z.boolean(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const settings = await db.userSettings.upsert({
    where: { userId: session.user.id },
    update: {},
    create: { userId: session.user.id },
    select: settingsSelect,
  });
  return NextResponse.json({ settings });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid notification settings" }, { status: 400 });
  const settings = await db.userSettings.upsert({ where: { userId: session.user.id }, update: parsed.data, create: { userId: session.user.id, ...parsed.data }, select: settingsSelect });
  return NextResponse.json({ settings });
}
