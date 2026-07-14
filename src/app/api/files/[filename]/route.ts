import { readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function findAuthorizedFile(filename: string) {
  if (path.basename(filename) !== filename) return null;
  const session = await auth();
  const file = await db.signalFile.findFirst({
    where: { filename },
    include: {
      signal: {
        select: {
          ownerId: true,
          visibility: true,
          selectedUserIds: true,
          frequencyId: true,
          isDeleted: true,
          ghostModeExpiresAt: true,
          ghostMode: true,
          ghostModeOpenedAt: true,
          ghostModeOpenedBy: true,
        },
      },
    },
  });
  if (!file || file.signal.isDeleted) return null;

  const userId = session?.user?.id;
  const publicAccess = file.signal.visibility === "PUBLIC" || file.signal.visibility === "UNLISTED";
  const selectedAccess = Boolean(userId && file.signal.selectedUserIds.split(",").includes(userId));
  const collaboratorAccess = Boolean(userId && file.signal.frequencyId && await db.frequencyCollaborator.findFirst({
    where: { frequencyId: file.signal.frequencyId, userId, acceptedAt: { not: null } },
    select: { id: true },
  }));
  if (!publicAccess && file.signal.ownerId !== userId && !selectedAccess && !collaboratorAccess) return null;
  if (file.signal.ghostModeExpiresAt && file.signal.ghostModeExpiresAt <= new Date()) return null;
  if (file.signal.ghostMode === "OPEN_ONCE" && file.signal.ghostModeOpenedAt && file.signal.ownerId !== userId && file.signal.ghostModeOpenedBy !== userId) return null;
  return { file, publicAccess };
}

export async function GET(request: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  const authorized = await findAuthorizedFile(filename);
  if (!authorized) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const root = path.resolve(process.env.UPLOAD_DIR || "public/uploads");
    const body = await readFile(path.join(root, filename));
    const url = new URL(request.url);
    const download = url.searchParams.get("download") === "1";
    const safeName = authorized.file.originalName.replace(/["\r\n]/g, "");
    const baseHeaders = {
      "accept-ranges": "bytes",
      "content-type": authorized.file.mimeType,
      "content-disposition": `${download ? "attachment" : "inline"}; filename="${safeName}"`,
      "cache-control": authorized.publicAccess ? "public, max-age=3600" : "private, no-store",
    };
    const range = request.headers.get("range")?.match(/^bytes=(\d+)-(\d*)$/);
    if (range) {
      const start = Number(range[1]);
      const end = range[2] ? Math.min(Number(range[2]), body.length - 1) : body.length - 1;
      if (!Number.isInteger(start) || start < 0 || start >= body.length || end < start) {
        return new Response(null, { status: 416, headers: { "content-range": `bytes */${body.length}` } });
      }
      const chunk = body.subarray(start, end + 1);
      return new Response(chunk, { status: 206, headers: { ...baseHeaders, "content-length": String(chunk.length), "content-range": `bytes ${start}-${end}/${body.length}` } });
    }
    return new Response(body, { headers: { ...baseHeaders, "content-length": String(body.length) } });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ filename: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { filename } = await params;
  if (path.basename(filename) !== filename) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const file = await db.signalFile.findFirst({ where: { filename }, include: { signal: { select: { ownerId: true } } } });
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (file.signal.ownerId !== session.user.id && session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await db.signalFile.delete({ where: { id: file.id } });
  const root = path.resolve(process.env.UPLOAD_DIR || "public/uploads");
  await unlink(path.join(root, filename)).catch(() => undefined);
  return NextResponse.json({ success: true });
}
