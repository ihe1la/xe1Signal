import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const settingsSelect = { theme: true, compactMode: true, reducedMotion: true } as const;
const schema = z.object({
  theme: z.enum(["light", "dark", "system"]),
  compactMode: z.boolean(),
  reducedMotion: z.boolean(),
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
  if (!parsed.success) return NextResponse.json({ error: "Invalid appearance settings" }, { status: 400 });
  const settings = await db.userSettings.upsert({ where: { userId: session.user.id }, update: parsed.data, create: { userId: session.user.id, ...parsed.data }, select: settingsSelect });
  return NextResponse.json({ settings });
}
