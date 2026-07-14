import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await db.user.findUnique({ where: { id: session.user.id }, include: { signals: true, frequencies: true, trails: true, settings: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const safeUser = Object.fromEntries(Object.entries(user).filter(([key]) => key !== "passwordHash"));
  return NextResponse.json({ exportedAt: new Date().toISOString(), user: safeUser }, { headers: { "content-disposition": `attachment; filename="signal-archive-${user.username}.json"` } });
}
