ALTER TABLE "User" ADD COLUMN "currentMoodSymbol" TEXT NOT NULL DEFAULT '🌙';

INSERT INTO "ResearchTrail" (
  "id", "ownerId", "title", "description", "visibility", "nodeCount",
  "viewCount", "isArchived", "createdAt", "updatedAt"
)
SELECT
  'starter-' || "id",
  "id",
  'My first trail',
  'A blank path for connecting signals, notes, and ideas.',
  'PRIVATE',
  0,
  0,
  false,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "User"
WHERE NOT EXISTS (
  SELECT 1 FROM "ResearchTrail" WHERE "ResearchTrail"."ownerId" = "User"."id"
);
