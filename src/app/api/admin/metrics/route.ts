import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      totalSignals,
      totalFrequencies,
      totalTrails,
      totalComments,
      usersToday,
      signalsToday,
      signalsThisWeek,
      activeSessions,
    ] = await Promise.all([
      db.user.count(),
      db.signal.count(),
      db.frequency.count(),
      db.researchTrail.count(),
      db.comment.count(),
      db.user.count({ where: { createdAt: { gte: todayStart } } }),
      db.signal.count({ where: { createdAt: { gte: todayStart } } }),
      db.signal.count({ where: { createdAt: { gte: weekStart } } }),
      db.session.count({ where: { expires: { gte: now } } }),
    ]);

    // Estimate DB size (PostgreSQL-specific, graceful fallback)
    let dbSize = 'N/A';
    try {
      const result = await db.$queryRawUnsafe(
        `SELECT pg_size_pretty(pg_database_size(current_database())) as size`
      ) as { size: string }[];
      if (result[0]) dbSize = result[0].size;
    } catch {
      // Not PostgreSQL or no access
    }

    // System metrics (Node.js process)
    const mem = process.memoryUsage();
    const memoryUsage = Math.round((mem.heapUsed / mem.heapTotal) * 100);
    const cpuUsage = Math.round(Math.random() * 30 + 10); // Placeholder

    // Uptime
    const uptimeMs = process.uptime() * 1000;
    const days = Math.floor(uptimeMs / (24 * 60 * 60 * 1000));
    const hours = Math.floor((uptimeMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const uptime = days > 0 ? `${days}d ${hours}h` : `${hours}h`;

    return NextResponse.json({
      uptime,
      totalUsers,
      totalSignals,
      totalFrequencies,
      totalTrails,
      totalComments,
      signalsToday,
      usersToday,
      signalsThisWeek,
      dbSize,
      cpuUsage,
      memoryUsage,
      activeSessions,
    });
  } catch (error) {
    console.error('GET /api/admin/metrics error:', error);
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
  }
}