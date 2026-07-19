-- CreateTable
CREATE TABLE "ReflectionRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "targetUrl" TEXT NOT NULL,
    "finalRequestUrl" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "contentType" TEXT NOT NULL,
    "responseSize" INTEGER NOT NULL,
    "responseTimeMs" INTEGER NOT NULL,
    "requestCount" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReflectionRun_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReflectionResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "parameterName" TEXT NOT NULL,
    "occurrenceIndex" INTEGER NOT NULL,
    "marker" TEXT NOT NULL,
    "reflected" BOOLEAN NOT NULL,
    "reflectionCount" INTEGER NOT NULL,
    "firstPosition" INTEGER,
    "context" TEXT,
    "encoding" TEXT,
    "responseSection" TEXT,
    "snippet" TEXT,
    CONSTRAINT "ReflectionResult_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ReflectionRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ReflectionRun_createdById_idx" ON "ReflectionRun"("createdById");
CREATE INDEX "ReflectionRun_createdAt_idx" ON "ReflectionRun"("createdAt");
CREATE INDEX "ReflectionResult_runId_idx" ON "ReflectionResult"("runId");
CREATE INDEX "ReflectionResult_reflected_idx" ON "ReflectionResult"("reflected");
