import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { canAccessOwnerTools } from "@/lib/owner-access";
import { trackerUsernameMatches, updateTrackerTimer } from "@/lib/tracker-client";

const schema = z.object({
  action: z.enum(["start", "pause", "stop"]),
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
    return NextResponse.json({ error: "Invalid timer request" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid timer request" }, { status: 400 });

  const result = await updateTrackerTimer(parsed.data);
  if (!result.workspace) return NextResponse.json({ error: result.error || "The timer could not be updated" }, { status: 502 });
  revalidatePath("/study");
  return NextResponse.json(result.workspace);
}
