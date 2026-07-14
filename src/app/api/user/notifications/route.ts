import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({ emailNotifications: z.boolean(), pushNotifications: z.boolean() });

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid notification settings" }, { status: 400 });
  const settings = await db.userSettings.upsert({ where: { userId: session.user.id }, update: parsed.data, create: { userId: session.user.id, ...parsed.data }, select: { emailNotifications: true, pushNotifications: true } });
  return NextResponse.json({ settings });
}
