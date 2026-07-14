import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({ currentPassword: z.string().min(8), newPassword: z.string().min(8).max(128) });

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid password input" }, { status: 400 });
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { passwordHash: true } });
  if (!user?.passwordHash || !await bcrypt.compare(parsed.data.currentPassword, user.passwordHash)) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  await db.user.update({ where: { id: session.user.id }, data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 12) } });
  return NextResponse.json({ success: true });
}
