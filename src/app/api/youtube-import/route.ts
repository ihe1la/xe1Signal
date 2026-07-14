import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { copyFile, mkdir, mkdtemp, readdir, rm, stat, unlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeYouTubeUrl, youtubeDownloadArgs } from "@/lib/youtube-import";

export const runtime = "nodejs";
export const maxDuration = 120;

const execFileAsync = promisify(execFile);
const inputSchema = z.object({
  signalId: z.string().min(1),
  url: z.string().url(),
  rightsConfirmed: z.literal(true),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { username: true } });
  if (user?.username.toLowerCase() !== "hela") {
    return NextResponse.json({ error: "YouTube importing is restricted to the hela account" }, { status: 403 });
  }

  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Confirm your rights and provide a valid signal and URL" }, { status: 400 });
  const normalizedUrl = normalizeYouTubeUrl(parsed.data.url);
  if (!normalizedUrl) return NextResponse.json({ error: "Use a single public YouTube video URL, not a playlist" }, { status: 400 });

  const signal = await db.signal.findFirst({
    where: { id: parsed.data.signalId, ownerId: session.user.id, isDeleted: false, type: "SONG" },
    select: { id: true, title: true },
  });
  if (!signal) return NextResponse.json({ error: "Song signal not found" }, { status: 404 });

  const maxBytes = Number(process.env.YOUTUBE_IMPORT_MAX_SIZE) || 10 * 1024 * 1024;
  const maxDurationSeconds = Number(process.env.YOUTUBE_IMPORT_MAX_DURATION) || 600;
  const jobDirectory = await mkdtemp(path.join(os.tmpdir(), "signal-youtube-"));
  let destination = "";

  try {
    const binary = process.env.YT_DLP_PATH || "yt-dlp";
    await execFileAsync(binary, youtubeDownloadArgs(normalizedUrl, jobDirectory, maxBytes, maxDurationSeconds), {
      timeout: 110_000,
      maxBuffer: 1024 * 1024,
      windowsHide: true,
    });

    const files = (await readdir(jobDirectory)).filter((name) => name.toLowerCase().endsWith(".mp3"));
    if (files.length !== 1) throw new Error("NO_MEDIA");
    const downloaded = path.join(jobDirectory, files[0]);
    const info = await stat(downloaded);
    if (info.size <= 0 || info.size > maxBytes) throw new Error("SIZE_LIMIT");

    const filename = `${crypto.randomUUID()}.mp3`;
    const uploadRoot = path.resolve(process.env.UPLOAD_DIR || "public/uploads");
    destination = path.join(uploadRoot, filename);
    await mkdir(uploadRoot, { recursive: true });
    await copyFile(downloaded, destination, constants.COPYFILE_EXCL);

    const originalBase = (signal.title || "YouTube audio").replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").slice(0, 120).trim() || "YouTube audio";
    const file = await db.signalFile.create({
      data: {
        signalId: signal.id,
        filename,
        originalName: `${originalBase}.mp3`,
        mimeType: "audio/mpeg",
        size: info.size,
        url: `/api/files/${filename}`,
      },
    });
    return NextResponse.json({ file }, { status: 201 });
  } catch (error) {
    if (destination) await unlink(destination).catch(() => undefined);
    const detail = error instanceof Error ? `${error.message}\n${"stderr" in error ? String(error.stderr) : ""}` : "";
    console.error("POST /api/youtube-import error:", detail.slice(0, 2000));
    if (/SIZE_LIMIT|larger than max-filesize/i.test(detail)) return NextResponse.json({ error: "The audio exceeds the import size limit" }, { status: 413 });
    if (/duration|live event|filter/i.test(detail)) return NextResponse.json({ error: "Only non-live videos up to 10 minutes can be imported" }, { status: 422 });
    if (/ENOENT|not recognized/i.test(detail)) return NextResponse.json({ error: "The media importer is not installed on this server" }, { status: 503 });
    return NextResponse.json({ error: "YouTube could not provide downloadable audio for this video" }, { status: 422 });
  } finally {
    await rm(jobDirectory, { recursive: true, force: true });
  }
}
