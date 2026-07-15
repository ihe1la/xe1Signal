import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const moodSchema = z.object({
  mood: z.string().trim().min(1).max(60),
  symbol: z.string().trim().min(1).max(12).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { currentMood: true, currentMoodSymbol: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({ mood: user.currentMood, symbol: user.currentMoodSymbol });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = moodSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message || "Invalid mood" }, { status: 400 });
  const user = await db.user.update({ where: { id: session.user.id }, data: { currentMood: parsed.data.mood, currentMoodSymbol: parsed.data.symbol }, select: { currentMood: true, currentMoodSymbol: true } });
  return NextResponse.json({ mood: user.currentMood, symbol: user.currentMoodSymbol });
}
