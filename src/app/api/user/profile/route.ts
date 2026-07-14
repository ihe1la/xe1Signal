import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const profileSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  username: z.string().trim().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/).transform((value) => value.toLowerCase()).optional(),
  bio: z.string().max(500).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { id: true, email: true, name: true, username: true, bio: true, avatarUrl: true, bannerUrl: true, currentMood: true, role: true } });
  return user ? NextResponse.json({ user }) : NextResponse.json({ error: "User not found" }, { status: 404 });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = profileSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message || "Invalid profile" }, { status: 400 });
  if (parsed.data.username) {
    const taken = await db.user.findFirst({ where: { username: parsed.data.username, NOT: { id: session.user.id } }, select: { id: true } });
    if (taken) return NextResponse.json({ error: "This username is already taken" }, { status: 409 });
  }
  const user = await db.user.update({ where: { id: session.user.id }, data: parsed.data, select: { id: true, email: true, name: true, username: true, bio: true, avatarUrl: true, currentMood: true } });
  return NextResponse.json({ user });
}
