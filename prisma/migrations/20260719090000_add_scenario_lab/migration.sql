CREATE TABLE "LabRun" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "module" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "result" TEXT NOT NULL,
  "configurationJson" TEXT NOT NULL,
  "ownerNotes" TEXT NOT NULL DEFAULT '',
  "createdById" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LabRun_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "LabRun_createdById_createdAt_idx" ON "LabRun"("createdById", "createdAt");

CREATE TABLE "LabFilterRule" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "pattern" TEXT NOT NULL,
  "matchType" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "replacement" TEXT NOT NULL DEFAULT '',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL,
  "createdById" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "LabFilterRule_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "LabFilterRule_createdById_sortOrder_idx" ON "LabFilterRule"("createdById", "sortOrder");
