import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

import { db } from '@/lib/db';

const contentTypes: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

export async function GET(_: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  if (path.basename(filename) !== filename) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const url = `/api/profile-media/${filename}`;
  const referenced = await db.user.findFirst({ where: { OR: [{ avatarUrl: url }, { bannerUrl: url }] }, select: { id: true } });
  if (!referenced) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  try {
    const root = path.join(path.resolve(process.env.UPLOAD_DIR || 'public/uploads'), 'profiles');
    const body = await readFile(path.join(root, filename));
    return new Response(body, {
      headers: {
        'content-type': contentTypes[path.extname(filename).toLowerCase()] || 'application/octet-stream',
        'content-length': String(body.length),
        'cache-control': 'public, max-age=3600',
        'x-content-type-options': 'nosniff',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
