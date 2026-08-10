ALTER TABLE "PartyRoom" RENAME TO "VibeRoom";
ALTER TABLE "PartyQueueItem" RENAME TO "VibeQueueItem";

DROP INDEX "PartyRoom_slug_key";
DROP INDEX "PartyRoom_slug_idx";
DROP INDEX "PartyQueueItem_roomId_position_idx";
DROP INDEX "PartyQueueItem_roomId_status_idx";
DROP INDEX "PartyQueueItem_unstreamJobId_idx";

CREATE UNIQUE INDEX "VibeRoom_slug_key" ON "VibeRoom"("slug");
CREATE INDEX "VibeRoom_slug_idx" ON "VibeRoom"("slug");
CREATE INDEX "VibeQueueItem_roomId_position_idx" ON "VibeQueueItem"("roomId", "position");
CREATE INDEX "VibeQueueItem_roomId_status_idx" ON "VibeQueueItem"("roomId", "status");
CREATE INDEX "VibeQueueItem_unstreamJobId_idx" ON "VibeQueueItem"("unstreamJobId");
