CREATE TABLE "PartyRoom" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL,
  "currentItemId" TEXT,
  "isPlaying" BOOLEAN NOT NULL DEFAULT false,
  "revision" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "PartyRoom_slug_key" ON "PartyRoom"("slug");
CREATE INDEX "PartyRoom_slug_idx" ON "PartyRoom"("slug");

CREATE TABLE "PartyQueueItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "roomId" TEXT NOT NULL,
  "addedById" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "unstreamJobId" TEXT,
  "unstreamTrackId" TEXT,
  "title" TEXT NOT NULL,
  "artists" TEXT NOT NULL DEFAULT '',
  "cover" TEXT,
  "sourceUrl" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'resolving',
  "error" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "PartyQueueItem_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "PartyRoom" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PartyQueueItem_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "PartyQueueItem_roomId_position_idx" ON "PartyQueueItem"("roomId", "position");
CREATE INDEX "PartyQueueItem_roomId_status_idx" ON "PartyQueueItem"("roomId", "status");
CREATE INDEX "PartyQueueItem_unstreamJobId_idx" ON "PartyQueueItem"("unstreamJobId");

INSERT INTO "PartyRoom" ("id", "slug", "isPlaying", "revision", "createdAt", "updatedAt")
VALUES ('party-main', 'main', false, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
