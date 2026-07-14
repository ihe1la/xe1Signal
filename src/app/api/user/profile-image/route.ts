import crypto from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

const kindSchema = z.enum(['avatar', 'banner']);
const imagePolicies = new Map([
  ['.jpg', { mime: 'image/jpeg', matches: (b: Uint8Array) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff }],
  ['.jpeg', { mime: 'image/jpeg', matches: (b: Uint8Array) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff }],
  ['.png', { mime: 'image/png', matches: (b: Uint8Array) => [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b[i] === v) }],
  ['.webp', { mime: 'image/webp', matches: (b: Uint8Array) => String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP' }],
]);

function localFilename(url: string | null | undefined) {
  const prefix = '/api/profile-media/';
  if (!url?.startsWith(prefix)) return null;
  const filename = url.slice(prefix.length);
  return path.basename(filename) === filename ? filename : null;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const form = await request.formData();
  const file = form.get('file');
  const parsedKind = kindSchema.safeParse(form.get('kind'));
  if (!(file instanceof File) || !parsedKind.success) {
    return NextResponse.json({ error: 'An image and profile image type are required' }, { status: 400 });
  }

  const max = parsedKind.data === 'avatar' ? 2 * 1024 * 1024 : 5 * 1024 * 1024;
  if (file.size <= 0) return NextResponse.json({ error: 'The selected image is empty' }, { status: 400 });
  if (file.size > max) return NextResponse.json({ error: `${parsedKind.data === 'avatar' ? 'Avatar' : 'Cover'} exceeds the ${max / 1024 / 1024} MB limit` }, { status: 413 });

  const extension = path.extname(file.name).toLowerCase();
  const policy = imagePolicies.get(extension);
  if (!policy || file.type !== policy.mime) return NextResponse.json({ error: 'Use a JPG, PNG, or WebP image' }, { status: 415 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!policy.matches(bytes)) return NextResponse.json({ error: 'The file contents do not match its image type' }, { status: 415 });

  const filename = `${crypto.randomUUID()}${extension}`;
  const root = path.join(path.resolve(process.env.UPLOAD_DIR || 'public/uploads'), 'profiles');
  await mkdir(root, { recursive: true });
  await writeFile(path.join(root, filename), bytes, { flag: 'wx' });

  const current = await db.user.findUnique({ where: { id: session.user.id }, select: { avatarUrl: true, bannerUrl: true } });
  const url = `/api/profile-media/${filename}`;
  try {
    const user = await db.user.update({
      where: { id: session.user.id },
      data: parsedKind.data === 'avatar' ? { avatarUrl: url } : { bannerUrl: url },
      select: { id: true, username: true, avatarUrl: true, bannerUrl: true },
    });
    const previous = localFilename(parsedKind.data === 'avatar' ? current?.avatarUrl : current?.bannerUrl);
    if (previous) await unlink(path.join(root, previous)).catch(() => undefined);
    return NextResponse.json({ user, url }, { status: 201 });
  } catch (error) {
    await unlink(path.join(root, filename)).catch(() => undefined);
    console.error('POST /api/user/profile-image error:', error);
    return NextResponse.json({ error: 'The profile image could not be saved' }, { status: 500 });
  }
}
