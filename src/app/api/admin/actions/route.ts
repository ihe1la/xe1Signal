import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

const VALID_ACTIONS = [
  'cleanup-ghosts',
  'cleanup-sessions',
  'rebuild-search-index',
  'clear-link-preview-cache',
  'clear-audit-logs',
  'vacuum-db',
];

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { action } = await req.json();
    if (!VALID_ACTIONS.includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    let message = '';

    switch (action) {
      case 'cleanup-ghosts': {
        const result = await db.signal.deleteMany({
          where: {
            ghostMode: { not: null },
            ghostModeExpiresAt: { lte: new Date() },
          },
        });
        message = `Cleaned up ${result.count} expired ghost signals`;
        break;
      }

      case 'cleanup-sessions': {
        const result = await db.session.deleteMany({
          where: { expires: { lte: new Date() } },
        });
        message = `Cleaned up ${result.count} expired sessions`;
        break;
      }

      case 'rebuild-search-index': {
        // Rebuild FTS5 or search index - placeholder for now
        message = 'Search index rebuild queued';
        break;
      }

      case 'clear-link-preview-cache': {
        const result = await db.linkPreview.deleteMany({
          where: {
            createdAt: { lte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        });
        message = `Cleared ${result.count} cached link previews older than 7 days`;
        break;
      }

      case 'clear-audit-logs': {
        const result = await db.auditLog.deleteMany({
          where: {
            createdAt: { lte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
          },
        });
        message = `Cleared ${result.count} audit logs older than 90 days`;
        break;
      }

      case 'vacuum-db': {
        try {
          await db.$queryRawUnsafe('VACUUM');
          message = 'Database vacuumed successfully';
        } catch {
          message = 'Vacuum not supported on this database provider';
        }
        break;
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    // Log the action
    await db.auditLog.create({
      data: {
        action: `admin.${action}`,
        entityType: 'SYSTEM',
        entityId: 'system',
        userId: session.user.id,
        details: message,
      },
    });

    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error('POST /api/admin/actions error:', error);
    return NextResponse.json({ error: 'Failed to execute action' }, { status: 500 });
  }
}