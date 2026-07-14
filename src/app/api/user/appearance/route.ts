import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({ theme: z.enum(["light", "dark", "system"]) });

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid appearance settings" }, { status: 400 });
  const settings = await db.userSettings.upsert({ where: { userId: session.user.id }, update: { theme: parsed.data.theme }, create: { userId: session.user.id, theme: parsed.data.theme }, select: { theme: true } });
  return NextResponse.json({ settings });
}
