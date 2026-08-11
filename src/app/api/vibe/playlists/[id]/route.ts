import crypto from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteVibePlaylist, updateVibePlaylistCover } from "@/lib/vibe-server";

export const runtime = "nodejs";

const imagePolicies = new Map([
  [".jpg", { mime: "image/jpeg", matches: (b: Uint8Array) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff }],
  [".jpeg", { mime: "image/jpeg", matches: (b: Uint8Array) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff }],
  [".png", { mime: "image/png", matches: (b: Uint8Array) => [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b[i] === v) }],
  [".webp", { mime: "image/webp", matches: (b: Uint8Array) => String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP" }],
]);

function localCoverFilename(url: string | null | undefined) {
  const prefix = "/api/vibe/covers/";
  if (!url?.startsWith(prefix)) return null;
  const filename = url.slice(prefix.length);
  return path.basename(filename) === filename ? filename : null;
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const snapshot = await deleteVibePlaylist(id);
  if (!snapshot) return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
  return NextResponse.json(snapshot);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const form = await request.formData();
  const file = form.get("cover");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A cover image is required" }, { status: 400 });
  }

  const max = 5 * 1024 * 1024;
  if (file.size <= 0) return NextResponse.json({ error: "The selected image is empty" }, { status: 400 });
  if (file.size > max) return NextResponse.json({ error: "Cover exceeds the 5 MB limit" }, { status: 413 });

  const extension = path.extname(file.name).toLowerCase();
  const policy = imagePolicies.get(extension);
  if (!policy || (file.type && file.type !== "application/octet-stream" && file.type !== policy.mime)) {
    return NextResponse.json({ error: "Use a JPG, PNG, or WebP image" }, { status: 415 });
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!policy.matches(bytes)) return NextResponse.json({ error: "The file contents do not match its image type" }, { status: 415 });

  const existing = await db.vibePlaylist.findFirst({ where: { id }, select: { id: true, cover: true } });
  if (!existing) return NextResponse.json({ error: "Playlist not found" }, { status: 404 });

  const filename = `${crypto.randomUUID()}${extension}`;
  const root = path.join(path.resolve(process.env.UPLOAD_DIR || "public/uploads"), "vibe-covers");
  await mkdir(root, { recursive: true });
  await writeFile(path.join(root, filename), bytes, { flag: "wx" });

  const coverUrl = `/api/vibe/covers/${filename}`;
  try {
    const snapshot = await updateVibePlaylistCover(existing.id, coverUrl);
    if (!snapshot) {
      await unlink(path.join(root, filename)).catch(() => undefined);
      return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
    }
    const previous = localCoverFilename(existing.cover);
    if (previous) await unlink(path.join(root, previous)).catch(() => undefined);
    return NextResponse.json(snapshot);
  } catch (error) {
    await unlink(path.join(root, filename)).catch(() => undefined);
    console.error("PATCH /api/vibe/playlists/[id] error:", error);
    return NextResponse.json({ error: "The playlist cover could not be saved" }, { status: 500 });
  }
}
