import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import {
  isPartyPlayableStatus,
  joinPartyArtists,
  PARTY_ROOM_SLUG,
  splitPartyArtists,
  type PartyStatus,
} from "@/lib/party";
import {
  getUnstreamJob,
  resolveUnstreamUrl,
  startUnstreamDownload,
  UnstreamError,
  type UnstreamJob,
  type UnstreamQuality,
} from "@/lib/unstream-client";

type PartyListener = () => void;

export type PartyQueuePayload = {
  id: string;
  position: number;
  unstreamJobId: string | null;
  unstreamTrackId: string | null;
  title: string;
  artists: string[];
  cover: string | null;
  sourceUrl: string;
  status: PartyStatus;
  error: string | null;
  addedBy: {
    username: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
  fileUrl: string | null;
};

export type PartySnapshot = {
  room: {
    id: string;
    slug: string;
    currentItemId: string | null;
    isPlaying: boolean;
    revision: number;
  };
  nowPlaying: PartyQueuePayload | null;
  queue: PartyQueuePayload[];
};

const listeners = new Set<PartyListener>();
const activeMonitors = new Set<string>();

export function subscribeToParty(listener: PartyListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function publishPartyUpdate() {
  for (const listener of listeners) listener();
}

export async function ensureMainPartyRoom() {
  return db.partyRoom.upsert({
    where: { slug: PARTY_ROOM_SLUG },
    update: {},
    create: { slug: PARTY_ROOM_SLUG },
  });
}

function serializeQueueItem(item: {
  id: string;
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
}): PartyQueuePayload {
  const playable = isPartyPlayableStatus(item.status) && Boolean(item.unstreamJobId && item.unstreamTrackId);
  return {
    id: item.id,
    position: item.position,
    unstreamJobId: item.unstreamJobId,
    unstreamTrackId: item.unstreamTrackId,
    title: item.title,
    artists: splitPartyArtists(item.artists),
    cover: item.cover,
    sourceUrl: item.sourceUrl,
    status: item.status as PartyStatus,
    error: item.error,
    addedBy: {
      username: item.addedBy.username,
      name: item.addedBy.displayName || item.addedBy.name || item.addedBy.username,
    },
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    fileUrl: playable ? `/api/party/queue/${encodeURIComponent(item.id)}/file` : null,
  };
}

export async function getPartySnapshot(roomId?: string): Promise<PartySnapshot> {
  const room = roomId
    ? await db.partyRoom.findUnique({ where: { id: roomId } })
    : await ensureMainPartyRoom();
  if (!room) throw new Error("Party room not found");
  const queue = await db.partyQueueItem.findMany({
    where: { roomId: room.id },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    include: { addedBy: { select: { username: true, name: true, displayName: true } } },
  });
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
    queue: serialized,
  };
}

function partyErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "Party audio could not be prepared";
}

async function reconcilePartyRoom(tx: Prisma.TransactionClient, roomId: string, forceRevision = false) {
  const room = await tx.partyRoom.findUnique({ where: { id: roomId } });
  if (!room) return false;
  const items = await tx.partyQueueItem.findMany({
    where: { roomId },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });
  const current = room.currentItemId ? items.find((item) => item.id === room.currentItemId) : null;
  let nextCurrentId = room.currentItemId;
  let nextIsPlaying = room.isPlaying;
  let changed = forceRevision;

  if (!current || !isPartyPlayableStatus(current.status)) {
    const next = items.find((item) => isPartyPlayableStatus(item.status));
    nextCurrentId = next?.id || null;
    nextIsPlaying = Boolean(next);
    if (current?.status === "playing") {
      await tx.partyQueueItem.update({ where: { id: current.id }, data: { status: "ready" } });
      changed = true;
    }
    if (next && next.status !== "playing") {
      await tx.partyQueueItem.update({ where: { id: next.id }, data: { status: "playing" } });
      changed = true;
    }
  } else {
    const desiredStatus = room.isPlaying ? "playing" : "ready";
    if (current.status !== desiredStatus) {
      await tx.partyQueueItem.update({ where: { id: current.id }, data: { status: desiredStatus } });
      changed = true;
    }
  }

  if (nextCurrentId !== room.currentItemId || nextIsPlaying !== room.isPlaying) {
    changed = true;
  }
  if (changed) {
    await tx.partyRoom.update({
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

export async function enqueuePartyUrl({
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

  const lastItem = await db.partyQueueItem.findFirst({
    where: { roomId },
    orderBy: [{ position: "desc" }, { createdAt: "desc" }],
    select: { position: true },
  });
  const startPosition = (lastItem?.position ?? -1) + 1;
  const createdItems = await db.$transaction(async (tx) => {
    const items = [];
    for (const [index, track] of collection.tracks.entries()) {
      items.push(await tx.partyQueueItem.create({
        data: {
          roomId,
          addedById: userId,
          position: startPosition + index,
          unstreamTrackId: track.id,
          title: track.title,
          artists: joinPartyArtists(track.artists),
          cover: track.cover_url || collection.cover_url,
          sourceUrl,
          status: "resolving",
        },
      }));
    }
    return items;
  });
  publishPartyUpdate();

  try {
    const download = await startUnstreamDownload(sourceUrl, trackIds, quality);
    await db.partyQueueItem.updateMany({
      where: { id: { in: createdItems.map((item) => item.id) } },
      data: { unstreamJobId: download.job_id, status: "downloading", error: null },
    });
    publishPartyUpdate();
    monitorPartyJob(download.job_id);
  } catch (error) {
    await db.partyQueueItem.updateMany({
      where: { id: { in: createdItems.map((item) => item.id) } },
      data: { status: "failed", error: partyErrorMessage(error) },
    });
    await db.$transaction((tx) => reconcilePartyRoom(tx, roomId, true));
    publishPartyUpdate();
    throw error;
  }

  return getPartySnapshot(roomId);
}

function jobTrackMap(job: UnstreamJob) {
  return new Map(job.tracks.map((track) => [track.id, track]));
}

export async function syncPartyJob(jobId: string) {
  const items = await db.partyQueueItem.findMany({ where: { unstreamJobId: jobId }, select: { id: true, roomId: true, unstreamTrackId: true, status: true } });
  if (!items.length) return false;

  let job: UnstreamJob;
  try {
    job = await getUnstreamJob(jobId);
  } catch (error) {
    if (!(error instanceof UnstreamError && error.status === 404)) return false;
    await db.$transaction(async (tx) => {
      await tx.partyQueueItem.updateMany({ where: { unstreamJobId: jobId }, data: { status: "failed", error: "The Unstream job is no longer available" } });
      await reconcilePartyRoom(tx, items[0].roomId, true);
    });
    publishPartyUpdate();
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
        await tx.partyQueueItem.update({ where: { id: item.id }, data: { status: nextStatus, error: nextError } });
        itemChanged = true;
      }
    }
    return reconcilePartyRoom(tx, items[0].roomId, itemChanged);
  });
  if (changed) publishPartyUpdate();
  return changed;
}

async function monitorPartyJob(jobId: string) {
  if (activeMonitors.has(jobId)) return;
  activeMonitors.add(jobId);
  try {
    for (let attempt = 0; attempt < 2400; attempt += 1) {
      await syncPartyJob(jobId);
      const pending = await db.partyQueueItem.count({
        where: { unstreamJobId: jobId, status: { notIn: ["ready", "playing", "failed"] } },
      });
      if (!pending) break;
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  } finally {
    activeMonitors.delete(jobId);
  }
}

export function startPartyJobMonitor(jobId: string) {
  void monitorPartyJob(jobId);
}

export async function syncActivePartyJobs(roomId: string) {
  const jobs = await db.partyQueueItem.findMany({
    where: { roomId, status: { notIn: ["ready", "playing", "failed"] }, unstreamJobId: { not: null } },
    distinct: ["unstreamJobId"],
    select: { unstreamJobId: true },
  });
  await Promise.all(jobs.flatMap((item) => item.unstreamJobId ? [syncPartyJob(item.unstreamJobId)] : []));
}

export async function applyPartyControl(action: "play" | "pause" | "skip" | "clear", expectedItemId?: string) {
  const room = await ensureMainPartyRoom();
  await db.$transaction(async (tx) => {
    const currentRoom = await tx.partyRoom.findUnique({ where: { id: room.id } });
    if (!currentRoom) return;
    if (expectedItemId && currentRoom.currentItemId !== expectedItemId) return;
    if (action === "clear") {
      await tx.partyQueueItem.deleteMany({ where: { roomId: room.id } });
      await tx.partyRoom.update({ where: { id: room.id }, data: { currentItemId: null, isPlaying: false, revision: { increment: 1 } } });
      return;
    }

    const items = await tx.partyQueueItem.findMany({ where: { roomId: room.id }, orderBy: [{ position: "asc" }, { createdAt: "asc" }] });
    const current = currentRoom.currentItemId ? items.find((item) => item.id === currentRoom.currentItemId) : null;
    if (action === "pause") {
      if (current && isPartyPlayableStatus(current.status) && current.status !== "ready") await tx.partyQueueItem.update({ where: { id: current.id }, data: { status: "ready" } });
      await tx.partyRoom.update({ where: { id: room.id }, data: { isPlaying: false, revision: { increment: 1 } } });
      return;
    }

    const next = action === "skip"
      ? items.slice(current ? items.findIndex((item) => item.id === current.id) + 1 : 0).find((item) => isPartyPlayableStatus(item.status))
      : current && isPartyPlayableStatus(current.status)
        ? current
        : items.find((item) => isPartyPlayableStatus(item.status));
    if (current && current.id !== next?.id && current.status === "playing") await tx.partyQueueItem.update({ where: { id: current.id }, data: { status: "ready" } });
    if (next && next.status !== "playing") await tx.partyQueueItem.update({ where: { id: next.id }, data: { status: "playing" } });
    await tx.partyRoom.update({ where: { id: room.id }, data: { currentItemId: next?.id || null, isPlaying: Boolean(next), revision: { increment: 1 } } });
  });
  publishPartyUpdate();
  return getPartySnapshot(room.id);
}

export async function deletePartyQueueItem(itemId: string) {
  const room = await ensureMainPartyRoom();
  const deleted = await db.$transaction(async (tx) => {
    const item = await tx.partyQueueItem.findFirst({ where: { id: itemId, roomId: room.id } });
    if (!item) return false;
    await tx.partyQueueItem.delete({ where: { id: item.id } });
    await reconcilePartyRoom(tx, room.id, true);
    return true;
  });
  if (deleted) publishPartyUpdate();
  return deleted ? getPartySnapshot(room.id) : null;
}
