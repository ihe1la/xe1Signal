import crypto from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type FilePolicy = {
  mimeType: string;
  declaredTypes: string[];
  matches: (bytes: Uint8Array) => boolean;
};

const startsWith = (bytes: Uint8Array, signature: number[]) =>
  signature.every((value, index) => bytes[index] === value);
const ascii = (bytes: Uint8Array, start: number, value: string) =>
  value.split("").every((character, index) => bytes[start + index] === character.charCodeAt(0));

const policies = new Map<string, FilePolicy>([
  [".jpg", { mimeType: "image/jpeg", declaredTypes: ["image/jpeg"], matches: (b) => startsWith(b, [0xff, 0xd8, 0xff]) }],
  [".jpeg", { mimeType: "image/jpeg", declaredTypes: ["image/jpeg"], matches: (b) => startsWith(b, [0xff, 0xd8, 0xff]) }],
  [".png", { mimeType: "image/png", declaredTypes: ["image/png"], matches: (b) => startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) }],
  [".gif", { mimeType: "image/gif", declaredTypes: ["image/gif"], matches: (b) => ascii(b, 0, "GIF87a") || ascii(b, 0, "GIF89a") }],
  [".webp", { mimeType: "image/webp", declaredTypes: ["image/webp"], matches: (b) => ascii(b, 0, "RIFF") && ascii(b, 8, "WEBP") }],
  [".mp3", { mimeType: "audio/mpeg", declaredTypes: ["audio/mpeg", "audio/mp3"], matches: (b) => ascii(b, 0, "ID3") || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0) }],
  [".wav", { mimeType: "audio/wav", declaredTypes: ["audio/wav", "audio/x-wav"], matches: (b) => ascii(b, 0, "RIFF") && ascii(b, 8, "WAVE") }],
  [".ogg", { mimeType: "audio/ogg", declaredTypes: ["audio/ogg", "application/ogg"], matches: (b) => ascii(b, 0, "OggS") }],
  [".m4a", { mimeType: "audio/mp4", declaredTypes: ["audio/mp4", "audio/x-m4a", "video/mp4"], matches: (b) => ascii(b, 4, "ftyp") }],
  [".flac", { mimeType: "audio/flac", declaredTypes: ["audio/flac", "audio/x-flac"], matches: (b) => ascii(b, 0, "fLaC") }],
  [".pdf", { mimeType: "application/pdf", declaredTypes: ["application/pdf"], matches: (b) => ascii(b, 0, "%PDF-") }],
  [".docx", { mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", declaredTypes: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/zip"], matches: (b) => startsWith(b, [0x50, 0x4b, 0x03, 0x04]) }],
  [".doc", { mimeType: "application/msword", declaredTypes: ["application/msword", "application/x-ole-storage"], matches: (b) => startsWith(b, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]) }],
  [".txt", { mimeType: "text/plain", declaredTypes: ["text/plain", ""], matches: (b) => !b.slice(0, 8192).includes(0) }],
  [".md", { mimeType: "text/markdown", declaredTypes: ["text/plain", "text/markdown", ""], matches: (b) => !b.slice(0, 8192).includes(0) }],
]);

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  const signalId = form.get("signalId");
  if (!(file instanceof File) || typeof signalId !== "string" || !signalId) {
    return NextResponse.json({ error: "A file and signal are required" }, { status: 400 });
  }

  const signal = await db.signal.findFirst({ where: { id: signalId, ownerId: session.user.id, isDeleted: false }, select: { id: true } });
  if (!signal) return NextResponse.json({ error: "Signal not found" }, { status: 404 });

  const max = Number(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024;
  if (file.size <= 0) return NextResponse.json({ error: "The selected file is empty" }, { status: 400 });
  if (file.size > max) return NextResponse.json({ error: `File exceeds the ${Math.floor(max / 1024 / 1024)} MB limit` }, { status: 413 });

  const extension = path.extname(file.name).toLowerCase();
  const policy = policies.get(extension);
  if (!policy) return NextResponse.json({ error: "This file extension is not supported" }, { status: 415 });
  if (file.type && file.type !== "application/octet-stream" && !policy.declaredTypes.includes(file.type)) {
    return NextResponse.json({ error: "The file extension does not match its media type" }, { status: 415 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!policy.matches(bytes)) {
    return NextResponse.json({ error: "The file contents do not match the selected file type" }, { status: 415 });
  }

  const filename = `${crypto.randomUUID()}${extension}`;
  const root = path.resolve(process.env.UPLOAD_DIR || "public/uploads");
  const destination = path.join(root, filename);
  await mkdir(root, { recursive: true });
  await writeFile(destination, bytes, { flag: "wx" });

  try {
    const url = `/api/files/${filename}`;
    const record = await db.signalFile.create({
      data: {
        signalId: signal.id,
        filename,
        originalName: path.basename(file.name),
        mimeType: policy.mimeType,
        size: file.size,
        url,
        thumbnailUrl: policy.mimeType.startsWith("image/") ? url : null,
      },
    });
    return NextResponse.json({ file: record }, { status: 201 });
  } catch (error) {
    await unlink(destination).catch(() => undefined);
    console.error("POST /api/uploads error:", error);
    return NextResponse.json({ error: "The file could not be saved" }, { status: 500 });
  }
}
