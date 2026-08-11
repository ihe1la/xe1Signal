import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import {
  isVibePlayableStatus,
  joinVibeArtists,
  VIBE_ROOM_SLUG,
  splitVibeArtists,
  type VibeStatus,
} from "@/lib/vibe";
import {
  getUnstreamJob,
  resolveUnstreamUrl,
  startUnstreamDownload,
  UnstreamError,
  type UnstreamJob,
  type UnstreamQuality,
} from "@/lib/unstream-client";

type VibeListener = () => void;

export type VibeQueuePayload = {
  id: string;
  playlistId: string | null;
  position: number;
  unstreamJobId: string | null;
  unstreamTrackId: string | null;
  title: string;
  artists: string[];
  cover: string | null;
  sourceUrl: string;
  status: VibeStatus;
  error: string | null;
  addedBy: {
    username: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
  fileUrl: string | null;
};

export type VibePlaylistPayload = {
  id: string;
  name: string;
  kind: string;
  sourceUrl: string;
  cover: string | null;
  owner: string | null;
  position: number;
  trackCount: number;
  readyCount: number;
  createdAt: string;
};

export type VibeSnapshot = {
  room: {
    id: string;
    slug: string;
    currentItemId: string | null;
    isPlaying: boolean;
    revision: number;
  };
  nowPlaying: VibeQueuePayload | null;
  playlists: VibePlaylistPayload[];
  queue: VibeQueuePayload[];
};

const listeners = new Set<VibeListener>();
const activeMonitors = new Set<string>();

export function subscribeToVibe(listener: VibeListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function publishVibeUpdate() {
  for (const listener of listeners) listener();
}

export async function ensureMainVibeRoom() {
  return db.vibeRoom.upsert({
    where: { slug: VIBE_ROOM_SLUG },
    update: {},
    create: { slug: VIBE_ROOM_SLUG },
  });
}

function serializeQueueItem(item: {
  id: string;
  playlistId: string | null;
  position: number;
  unstreamJobId: string | null;
  unstreamTrackId: string | null;
  title: string;
  artists: string;
  cover: string | null;
  sourceUrl: string;
  status: string;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
  addedBy: { username: string; name: string | null; displayName: string | null };
}): VibeQueuePayload {
  const playable = isVibePlayableStatus(item.status) && Boolean(item.unstreamJobId && item.unstreamTrackId);
  return {
    id: item.id,
    playlistId: item.playlistId,
    position: item.position,
    unstreamJobId: item.unstreamJobId,
    unstreamTrackId: item.unstreamTrackId,
    title: item.title,
    artists: splitVibeArtists(item.artists),
    cover: item.cover,
    sourceUrl: item.sourceUrl,
    status: item.status as VibeStatus,
    error: item.error,
    addedBy: {
      username: item.addedBy.username,
      name: item.addedBy.displayName || item.addedBy.name || item.addedBy.username,
    },
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    fileUrl: playable ? `/api/vibe/queue/${encodeURIComponent(item.id)}/file` : null,
  };
}

export async function getVibeSnapshot(roomId?: string): Promise<VibeSnapshot> {
  const room = roomId
    ? await db.vibeRoom.findUnique({ where: { id: roomId } })
    : await ensureMainVibeRoom();
  if (!room) throw new Error("Vibe room not found");
  const [queue, playlists] = await Promise.all([
    db.vibeQueueItem.findMany({
      where: { roomId: room.id },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      include: { addedBy: { select: { username: true, name: true, displayName: true } } },
    }),
    db.vibePlaylist.findMany({
      where: { roomId: room.id },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      include: { _count: { select: { items: true } }, items: { select: { status: true } } },
    }),
  ]);
  const serialized = queue.map(serializeQueueItem);
  return {
    room: {
      id: room.id,
      slug: room.slug,
      currentItemId: room.currentItemId,
      isPlaying: room.isPlaying,
      revision: room.revision,
    },
    nowPlaying: serialized.find((item) => item.id === room.currentItemId) || null,
    playlists: playlists.map((playlist) => ({
      id: playlist.id,
      name: playlist.name,
      kind: playlist.kind,
      sourceUrl: playlist.sourceUrl,
      cover: playlist.cover,
      owner: playlist.owner,
      position: playlist.position,
      trackCount: playlist._count.items,
      readyCount: playlist.items.filter((item) => isVibePlayableStatus(item.status)).length,
      createdAt: playlist.createdAt.toISOString(),
    })),
    queue: serialized,
  };
}

function vibeErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "Vibe audio could not be prepared";
}

function aestheticPlaylistName(kind: string, name: string, owner: string) {
  const cleaned = name.trim() || (kind === "album" ? "Untitled album" : "Untitled playlist");
  if (owner.trim() && !cleaned.toLowerCase().includes(owner.trim().toLowerCase())) {
    return `${cleaned}`;
  }
  return cleaned;
}

async function reconcileVibeRoom(tx: Prisma.TransactionClient, roomId: string, forceRevision = false) {
  const room = await tx.vibeRoom.findUnique({ where: { id: roomId } });
  if (!room) return false;
  const items = await tx.vibeQueueItem.findMany({
    where: { roomId },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });
  const current = room.currentItemId ? items.find((item) => item.id === room.currentItemId) : null;
  let nextCurrentId = room.currentItemId;
  let nextIsPlaying = room.isPlaying;
  let changed = forceRevision;

  if (!current || !isVibePlayableStatus(current.status)) {
    const next = items.find((item) => isVibePlayableStatus(item.status));
    nextCurrentId = next?.id || null;
    nextIsPlaying = Boolean(next);
    if (current?.status === "playing") {
      await tx.vibeQueueItem.update({ where: { id: current.id }, data: { status: "ready" } });
      changed = true;
    }
    if (next && next.status !== "playing") {
      await tx.vibeQueueItem.update({ where: { id: next.id }, data: { status: "playing" } });
      changed = true;
    }
  } else {
    const desiredStatus = room.isPlaying ? "playing" : "ready";
    if (current.status !== desiredStatus) {
      await tx.vibeQueueItem.update({ where: { id: current.id }, data: { status: desiredStatus } });
      changed = true;
    }
  }

  if (nextCurrentId !== room.currentItemId || nextIsPlaying !== room.isPlaying) {
    changed = true;
  }
  if (changed) {
    await tx.vibeRoom.update({
      where: { id: roomId },
      data: {
        currentItemId: nextCurrentId,
        isPlaying: nextIsPlaying,
        revision: { increment: 1 },
      },
    });
  }
  return changed;
}

export async function enqueueVibeUrl({
  roomId,
  userId,
  sourceUrl,
  quality = "192",
}: {
  roomId: string;
  userId: string;
  sourceUrl: string;
  quality?: UnstreamQuality;
}) {
  const collection = await resolveUnstreamUrl(sourceUrl);
  const trackIds = collection.tracks.map((track) => track.id);
  if (!trackIds.length) throw new Error("Unstream returned no playable tracks");

  const [lastItem, lastPlaylist] = await Promise.all([
    db.vibeQueueItem.findFirst({
      where: { roomId },
      orderBy: [{ position: "desc" }, { createdAt: "desc" }],
      select: { position: true },
    }),
    db.vibePlaylist.findFirst({
      where: { roomId },
      orderBy: [{ position: "desc" }, { createdAt: "desc" }],
      select: { position: true },
    }),
  ]);
  const startPosition = (lastItem?.position ?? -1) + 1;
  const playlistPosition = (lastPlaylist?.position ?? -1) + 1;
  const isCollection = collection.kind === "playlist" || collection.kind === "album" || collection.tracks.length > 1;
  const playlistName = aestheticPlaylistName(collection.kind, collection.name, collection.owner);

  const createdItems = await db.$transaction(async (tx) => {
    const playlist = isCollection
      ? await tx.vibePlaylist.create({
          data: {
            roomId,
            name: playlistName,
            kind: collection.kind === "album" ? "album" : "playlist",
            sourceUrl,
            cover: collection.cover_url,
            owner: collection.owner || null,
            position: playlistPosition,
          },
        })
      : null;

    const items = [];
    for (const [index, track] of collection.tracks.entries()) {
      items.push(await tx.vibeQueueItem.create({
        data: {
          roomId,
          playlistId: playlist?.id ?? null,
          addedById: userId,
          position: startPosition + index,
          unstreamTrackId: track.id,
          title: track.title,
          artists: joinVibeArtists(track.artists),
          cover: track.cover_url || collection.cover_url,
          sourceUrl,
          status: "resolving",
        },
      }));
    }
    return items;
  });
  publishVibeUpdate();

  try {
    const download = await startUnstreamDownload(sourceUrl, trackIds, quality);
    await db.vibeQueueItem.updateMany({
      where: { id: { in: createdItems.map((item) => item.id) } },
      data: { unstreamJobId: download.job_id, status: "downloading", error: null },
    });
    publishVibeUpdate();
    monitorVibeJob(download.job_id);
  } catch (error) {
    await db.vibeQueueItem.updateMany({
      where: { id: { in: createdItems.map((item) => item.id) } },
      data: { status: "failed", error: vibeErrorMessage(error) },
    });
    await db.$transaction((tx) => reconcileVibeRoom(tx, roomId, true));
    publishVibeUpdate();
    throw error;
  }

  return getVibeSnapshot(roomId);
}

function jobTrackMap(job: UnstreamJob) {
  return new Map(job.tracks.map((track) => [track.id, track]));
}

export async function syncVibeJob(jobId: string) {
  const items = await db.vibeQueueItem.findMany({ where: { unstreamJobId: jobId }, select: { id: true, roomId: true, unstreamTrackId: true, status: true } });
  if (!items.length) return false;

  let job: UnstreamJob;
  try {
    job = await getUnstreamJob(jobId);
  } catch (error) {
    if (!(error instanceof UnstreamError && error.status === 404)) return false;
    await db.$transaction(async (tx) => {
      await tx.vibeQueueItem.updateMany({ where: { unstreamJobId: jobId }, data: { status: "failed", error: "The Unstream job is no longer available" } });
      await reconcileVibeRoom(tx, items[0].roomId, true);
    });
    publishVibeUpdate();
    return true;
  }

  const statuses = jobTrackMap(job);
  const changed = await db.$transaction(async (tx) => {
    let itemChanged = false;
    for (const item of items) {
      const track = item.unstreamTrackId ? statuses.get(item.unstreamTrackId) : undefined;
      const nextStatus = track?.status === "done" ? "ready" : track?.status === "error" ? "failed" : "downloading";
      const nextError = nextStatus === "failed" ? track?.error || "Unstream could not finish this track" : null;
      if (item.status !== nextStatus || (item.status === "failed" && nextError)) {
        await tx.vibeQueueItem.update({ where: { id: item.id }, data: { status: nextStatus, error: nextError } });
        itemChanged = true;
      }
    }
    return reconcileVibeRoom(tx, items[0].roomId, itemChanged);
  });
  if (changed) publishVibeUpdate();
  return changed;
}

async function monitorVibeJob(jobId: string) {
  if (activeMonitors.has(jobId)) return;
  activeMonitors.add(jobId);
  try {
    for (let attempt = 0; attempt < 2400; attempt += 1) {
      await syncVibeJob(jobId);
      const pending = await db.vibeQueueItem.count({
        where: { unstreamJobId: jobId, status: { notIn: ["ready", "playing", "failed"] } },
      });
      if (!pending) break;
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  } finally {
    activeMonitors.delete(jobId);
  }
}

export function startVibeJobMonitor(jobId: string) {
  void monitorVibeJob(jobId);
}

export async function syncActiveVibeJobs(roomId: string) {
  const jobs = await db.vibeQueueItem.findMany({
    where: { roomId, status: { notIn: ["ready", "playing", "failed"] }, unstreamJobId: { not: null } },
    distinct: ["unstreamJobId"],
    select: { unstreamJobId: true },
  });
  await Promise.all(jobs.flatMap((item) => item.unstreamJobId ? [syncVibeJob(item.unstreamJobId)] : []));
}

export async function applyVibeControl(action: "play" | "pause" | "skip" | "clear" | "select", itemId?: string) {
  const room = await ensureMainVibeRoom();
  await db.$transaction(async (tx) => {
    const currentRoom = await tx.vibeRoom.findUnique({ where: { id: room.id } });
    if (!currentRoom) return;

    if (action === "select") {
      if (!itemId) return;
      const items = await tx.vibeQueueItem.findMany({ where: { roomId: room.id }, orderBy: [{ position: "asc" }, { createdAt: "asc" }] });
      const target = items.find((item) => item.id === itemId);
      if (!target || !isVibePlayableStatus(target.status)) return;
      const current = currentRoom.currentItemId ? items.find((item) => item.id === currentRoom.currentItemId) : null;
      if (current && current.id !== target.id && current.status === "playing") {
        await tx.vibeQueueItem.update({ where: { id: current.id }, data: { status: "ready" } });
      }
      if (target.status !== "playing") {
        await tx.vibeQueueItem.update({ where: { id: target.id }, data: { status: "playing" } });
      }
      await tx.vibeRoom.update({
        where: { id: room.id },
        data: { currentItemId: target.id, isPlaying: true, revision: { increment: 1 } },
      });
      return;
    }

    const expectedItemId = itemId;
    if (expectedItemId && currentRoom.currentItemId !== expectedItemId) return;
    if (action === "clear") {
      await tx.vibeQueueItem.deleteMany({ where: { roomId: room.id } });
      await tx.vibePlaylist.deleteMany({ where: { roomId: room.id } });
      await tx.vibeRoom.update({ where: { id: room.id }, data: { currentItemId: null, isPlaying: false, revision: { increment: 1 } } });
      return;
    }

    const items = await tx.vibeQueueItem.findMany({ where: { roomId: room.id }, orderBy: [{ position: "asc" }, { createdAt: "asc" }] });
    const current = currentRoom.currentItemId ? items.find((item) => item.id === currentRoom.currentItemId) : null;
    if (action === "pause") {
      if (current && isVibePlayableStatus(current.status) && current.status !== "ready") await tx.vibeQueueItem.update({ where: { id: current.id }, data: { status: "ready" } });
      await tx.vibeRoom.update({ where: { id: room.id }, data: { isPlaying: false, revision: { increment: 1 } } });
      return;
    }

    const next = action === "skip"
      ? items.slice(current ? items.findIndex((item) => item.id === current.id) + 1 : 0).find((item) => isVibePlayableStatus(item.status))
      : current && isVibePlayableStatus(current.status)
        ? current
        : items.find((item) => isVibePlayableStatus(item.status));
    if (current && current.id !== next?.id && current.status === "playing") await tx.vibeQueueItem.update({ where: { id: current.id }, data: { status: "ready" } });
    if (next && next.status !== "playing") await tx.vibeQueueItem.update({ where: { id: next.id }, data: { status: "playing" } });
    await tx.vibeRoom.update({ where: { id: room.id }, data: { currentItemId: next?.id || null, isPlaying: Boolean(next), revision: { increment: 1 } } });
  });
  publishVibeUpdate();
  return getVibeSnapshot(room.id);
}

export async function deleteVibeQueueItem(itemId: string) {
  const room = await ensureMainVibeRoom();
  const deleted = await db.$transaction(async (tx) => {
    const item = await tx.vibeQueueItem.findFirst({ where: { id: itemId, roomId: room.id } });
    if (!item) return false;
    const playlistId = item.playlistId;
    await tx.vibeQueueItem.delete({ where: { id: item.id } });
    if (playlistId) {
      const remaining = await tx.vibeQueueItem.count({ where: { playlistId } });
      if (!remaining) await tx.vibePlaylist.delete({ where: { id: playlistId } }).catch(() => undefined);
    }
    await reconcileVibeRoom(tx, room.id, true);
    return true;
  });
  if (deleted) publishVibeUpdate();
  return deleted ? getVibeSnapshot(room.id) : null;
}

export async function deleteVibePlaylist(playlistId: string) {
  const room = await ensureMainVibeRoom();
  const deleted = await db.$transaction(async (tx) => {
    const playlist = await tx.vibePlaylist.findFirst({ where: { id: playlistId, roomId: room.id } });
    if (!playlist) return false;
    await tx.vibeQueueItem.deleteMany({ where: { playlistId: playlist.id } });
    await tx.vibePlaylist.delete({ where: { id: playlist.id } });
    await reconcileVibeRoom(tx, room.id, true);
    return true;
  });
  if (deleted) publishVibeUpdate();
  return deleted ? getVibeSnapshot(room.id) : null;
}

export async function updateVibePlaylistCover(playlistId: string, cover: string) {
  const room = await ensureMainVibeRoom();
  const playlist = await db.vibePlaylist.findFirst({ where: { id: playlistId, roomId: room.id }, select: { id: true } });
  if (!playlist) return null;
  await db.vibePlaylist.update({ where: { id: playlist.id }, data: { cover } });
  await db.vibeRoom.update({ where: { id: room.id }, data: { revision: { increment: 1 } } });
  publishVibeUpdate();
  return getVibeSnapshot(room.id);
}
