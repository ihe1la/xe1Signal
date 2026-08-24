import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseDumpNotes, serializeDumpNotes } from "@/lib/dump-notes";
import { parseFindings, serializeFindings } from "@/lib/findings";
import { mergeUpdatedItems } from "@/lib/merge-updated-items";

const requestSchema = z.object({
  scope: z.enum(["findings", "dump-notes"]),
  items: z.array(z.unknown()).max(2000),
  mode: z.enum(["merge", "pull"]).optional().default("merge"),
});

const MAX_PAYLOAD_LENGTH = 5_000_000;

function parseItems(scope: "findings" | "dump-notes", value: unknown[]) {
  const raw = JSON.stringify(value);
  if (raw.length > MAX_PAYLOAD_LENGTH) return null;
  const items = scope === "findings" ? parseFindings(raw) : parseDumpNotes(raw);
  return items.length === value.length ? items : null;
}

function storedItems(
  scope: "findings" | "dump-notes",
  state: { findingsJson: string; dumpNotesJson: string } | null,
) {
  if (!state) return [];
  return scope === "findings"
    ? parseFindings(state.findingsJson)
    : parseDumpNotes(state.dumpNotesJson);
}

function serializeItems(
  scope: "findings" | "dump-notes",
  items: ReturnType<typeof parseFindings> | ReturnType<typeof parseDumpNotes>,
) {
  return scope === "findings"
    ? serializeFindings(items as ReturnType<typeof parseFindings>)
    : serializeDumpNotes(items as ReturnType<typeof parseDumpNotes>);
}

async function save(
  userId: string,
  scope: "findings" | "dump-notes",
  serialized: string,
) {
  const data = scope === "findings" ? { findingsJson: serialized } : { dumpNotesJson: serialized };
  await db.toolWorkspaceState.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid notes" }, { status: 400 });
  const incoming = parseItems(parsed.data.scope, parsed.data.items);
  if (!incoming) return NextResponse.json({ error: "Invalid notes" }, { status: 400 });

  const state = await db.toolWorkspaceState.findUnique({
    where: { userId: session.user.id },
    select: { findingsJson: true, dumpNotesJson: true },
  });
  const stored = storedItems(parsed.data.scope, state);
  const merged = parsed.data.mode === "pull" && state ? stored : mergeUpdatedItems(stored, incoming);
  await save(session.user.id, parsed.data.scope, serializeItems(parsed.data.scope, merged));
  return NextResponse.json({ items: merged });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid notes" }, { status: 400 });
  const items = parseItems(parsed.data.scope, parsed.data.items);
  if (!items) return NextResponse.json({ error: "Invalid notes" }, { status: 400 });

  await save(session.user.id, parsed.data.scope, serializeItems(parsed.data.scope, items));
  return NextResponse.json({ items });
}
