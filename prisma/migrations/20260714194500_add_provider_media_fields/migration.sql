ALTER TABLE "Signal" ADD COLUMN "mediaProvider" TEXT;
ALTER TABLE "Signal" ADD COLUMN "mediaEntityType" TEXT;
ALTER TABLE "Signal" ADD COLUMN "externalId" TEXT;
ALTER TABLE "Signal" ADD COLUMN "providerUri" TEXT;
ALTER TABLE "Signal" ADD COLUMN "creatorName" TEXT;
ALTER TABLE "Signal" ADD COLUMN "thumbnailUrl" TEXT;
ALTER TABLE "Signal" ADD COLUMN "durationMs" INTEGER;
ALTER TABLE "Signal" ADD COLUMN "metadataJson" TEXT;

CREATE INDEX "Signal_mediaProvider_idx" ON "Signal"("mediaProvider");
CREATE INDEX "Signal_externalId_idx" ON "Signal"("externalId");
