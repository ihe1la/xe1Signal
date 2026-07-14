import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "OWNER") return NextResponse.json({ error: "The archive owner account cannot be deleted" }, { status: 403 });
  await db.user.delete({ where: { id: session.user.id } });
  return NextResponse.json({ success: true });
}
