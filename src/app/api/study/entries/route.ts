import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { canAccessOwnerTools } from "@/lib/owner-access";
import { createTrackerEntry, trackerUsernameMatches } from "@/lib/tracker-client";

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  durationSeconds: z.number().int().positive().max(24 * 60 * 60),
  labelId: z.number().int().positive().nullable().optional(),
  taskId: z.number().int().positive().nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccessOwnerTools(session.user.username)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!trackerUsernameMatches(session.user.username)) return NextResponse.json({ error: "Study tracker is not linked" }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid study entry" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid study entry" }, { status: 400 });

  const result = await createTrackerEntry(parsed.data);
  if (!result.workspace) return NextResponse.json({ error: result.error || "The study entry could not be saved" }, { status: 502 });
  revalidatePath("/study");
  return NextResponse.json(result.workspace, { status: 201 });
}
