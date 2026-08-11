-- AlterTable
ALTER TABLE "VibeQueueItem" ADD COLUMN "playlistId" TEXT;

-- CreateTable
CREATE TABLE "VibePlaylist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'playlist',
    "sourceUrl" TEXT NOT NULL,
    "cover" TEXT,
    "owner" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VibePlaylist_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "VibeRoom" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "VibePlaylist_roomId_position_idx" ON "VibePlaylist"("roomId", "position");

-- CreateIndex
CREATE INDEX "VibeQueueItem_playlistId_idx" ON "VibeQueueItem"("playlistId");
