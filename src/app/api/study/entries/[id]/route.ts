import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { canAccessOwnerTools } from "@/lib/owner-access";
import { deleteTrackerEntry, trackerUsernameMatches, updateTrackerEntry } from "@/lib/tracker-client";

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  durationSeconds: z.number().int().positive().max(24 * 60 * 60),
  labelId: z.number().int().positive().nullable().optional(),
  taskId: z.number().int().positive().nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
});

async function authorize() {
  const session = await auth();
  if (!session?.user?.id) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!canAccessOwnerTools(session.user.username)) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  if (!trackerUsernameMatches(session.user.username)) return { error: NextResponse.json({ error: "Study tracker is not linked" }, { status: 403 }) };
  return { session };
}

async function entryId(params: Promise<{ id: string }>) {
  const value = Number((await params).id);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await authorize();
  if (access.error) return access.error;
  const id = await entryId(params);
  if (!id) return NextResponse.json({ error: "Invalid study entry" }, { status: 400 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid study entry" }, { status: 400 });

  const result = await updateTrackerEntry(id, parsed.data);
  if (!result.workspace) return NextResponse.json({ error: result.error || "The study entry could not be updated" }, { status: 502 });
  revalidatePath("/study");
  return NextResponse.json(result.workspace);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await authorize();
  if (access.error) return access.error;
  const id = await entryId(params);
  if (!id) return NextResponse.json({ error: "Invalid study entry" }, { status: 400 });

  const result = await deleteTrackerEntry(id);
  if (!result.workspace) return NextResponse.json({ error: result.error || "The study entry could not be deleted" }, { status: 502 });
  revalidatePath("/study");
  return NextResponse.json(result.workspace);
}
