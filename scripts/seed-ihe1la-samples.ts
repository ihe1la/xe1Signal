import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const ownerUsername = "ihe1la";

const frequencySeeds = [
  { id: "sample-ihe1la-late-night", name: "Late-night thoughts", description: "Quiet fragments collected after midnight.", tags: "night,private,thoughts" },
  { id: "sample-ihe1la-broken-flows", name: "Broken flows", description: "Auth edges, strange redirects, and beautiful failures.", tags: "code,auth,debugging" },
  { id: "sample-ihe1la-beautiful-interfaces", name: "Beautiful interfaces", description: "Dark surfaces, precise spacing, and soft violet light.", tags: "design,interfaces,dark" },
  { id: "sample-ihe1la-songs-that-hurt", name: "Songs that hurt", description: "Songs for low light and private rooms.", tags: "music,blue,night" },
];

const signalSeeds = [
  { id: "sample-ihe1la-blue", type: "SONG", title: "BLUE", description: "Billie Eilish — for the hours that feel almost underwater.", sourceUrl: "https://open.spotify.com/track/2prqm9sPLj10B4Wg0wE5x9", sourceDomain: "open.spotify.com", mediaProvider: "spotify", mediaEntityType: "track", externalId: "2prqm9sPLj10B4Wg0wE5x9", providerUri: "spotify:track:2prqm9sPLj10B4Wg0wE5x9", creatorName: "Billie Eilish", thumbnailUrl: "https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e0271d62ea7ea8a5be92d3c1f62", previewImageUrl: "https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e0271d62ea7ea8a5be92d3c1f62", durationMs: 343000, tags: "billie eilish,blue,night", frequencyId: "sample-ihe1la-songs-that-hurt" },
  { id: "sample-ihe1la-tokyo", type: "IMAGE", title: "Tokyo textures", description: "Concrete curves, shadows, and quiet geometry.", previewImageUrl: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1200&q=80", sourceUrl: "https://unsplash.com/photos/city-buildings", sourceDomain: "unsplash.com", tags: "tokyo,architecture,shadow", frequencyId: "sample-ihe1la-beautiful-interfaces" },
  { id: "sample-ihe1la-noticing", type: "LINK", title: "The Art of Noticing", description: "Relearning how to pay attention before the feed decides for you.", sourceUrl: "https://robwalker.substack.com/", sourceDomain: "robwalker.substack.com", previewImageUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80", tags: "attention,noticing,web", frequencyId: "sample-ihe1la-late-night" },
  { id: "sample-ihe1la-oauth-note", type: "NOTE", title: "OAuth is just trust with better formatting.", description: "A note from the middle of a broken login flow.", content: "The redirect is rarely the bug. The state you carry through it usually is.", tags: "oauth,trust,notes", frequencyId: "sample-ihe1la-broken-flows" },
  { id: "sample-ihe1la-login-code", type: "CODE", title: "Return the session, not the promise", description: "The smallest useful version of the login boundary.", content: "async function login(creds) {\n  const session = await auth(creds)\n  if (!session?.user) throw new Error('no signal')\n  return session.user\n}", tags: "typescript,auth,session", frequencyId: "sample-ihe1la-broken-flows" },
  { id: "sample-ihe1la-login-screen", type: "SCREENSHOT", title: "Clean login flow", description: "One decision per screen. No visual noise.", previewImageUrl: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80", tags: "login,ui,screenshot", frequencyId: "sample-ihe1la-beautiful-interfaces" },
  { id: "sample-ihe1la-seoul", type: "IMAGE", title: "Seoul after rain", description: "Violet reflections and a city refusing to sleep.", previewImageUrl: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1200&q=80", sourceUrl: "https://unsplash.com/", sourceDomain: "unsplash.com", tags: "seoul,rain,neon", frequencyId: "sample-ihe1la-late-night" },
  { id: "sample-ihe1la-voice", type: "AUDIO", title: "idea at 3am", description: "What if archives remembered the path between fragments?", content: "A quiet voice memo placeholder for the thought that arrived too late.", tags: "voice,3am,idea", frequencyId: "sample-ihe1la-late-night" },
  { id: "sample-ihe1la-document", type: "DOCUMENT", title: "Private archive field notes", description: "A small document about attention, memory, and keeping only what matters.", content: "Signal Archive field notes\n\nKeep the fragments that change how you see the next one.", tags: "document,archive,field notes", frequencyId: "sample-ihe1la-late-night" },
] as const;

async function main() {
  const owner = await db.user.findUnique({ where: { username: ownerUsername }, select: { id: true } });
  if (!owner) throw new Error(`User @${ownerUsername} does not exist`);

  for (const frequency of frequencySeeds) {
    await db.frequency.upsert({
      where: { id: frequency.id },
      create: { ...frequency, ownerId: owner.id, visibility: "PUBLIC" },
      update: { name: frequency.name, description: frequency.description, tags: frequency.tags, ownerId: owner.id, visibility: "PUBLIC", isArchived: false },
    });
  }

  for (const [index, signal] of signalSeeds.entries()) {
    const data = { ...signal, ownerId: owner.id, visibility: "PUBLIC", isArchived: false, isDeleted: false, isDraft: false, signalStrength: 72 - index * 4 };
    await db.signal.upsert({ where: { id: signal.id }, create: data, update: data });
  }

  for (const frequency of frequencySeeds) {
    const signalCount = await db.signal.count({ where: { frequencyId: frequency.id, isDeleted: false, isArchived: false } });
    await db.frequency.update({ where: { id: frequency.id }, data: { signalCount } });
  }

  const trailId = "sample-ihe1la-night-transmission";
  await db.researchTrail.upsert({
    where: { id: trailId },
    create: { id: trailId, ownerId: owner.id, title: "Night transmission", description: "From BLUE to the idea that arrived at 3am.", visibility: "PRIVATE", nodeCount: 4 },
    update: { ownerId: owner.id, title: "Night transmission", description: "From BLUE to the idea that arrived at 3am.", visibility: "PRIVATE", nodeCount: 4, isArchived: false },
  });
  await db.researchTrailConnection.deleteMany({ where: { trailId } });
  await db.researchTrailNode.deleteMany({ where: { trailId } });
  const nodes = await Promise.all([
    ["sample-ihe1la-blue", "BLUE", "A song becomes a room."],
    ["sample-ihe1la-seoul", "Seoul after rain", "The same blue, reflected outside."],
    ["sample-ihe1la-oauth-note", "Trust and redirects", "A technical interruption."],
    ["sample-ihe1la-voice", "idea at 3am", "The archive remembers the path."],
  ].map(([signalId, title, content], order) => db.researchTrailNode.create({ data: { trailId, signalId, type: "SIGNAL", title, content, order, positionX: 70 + order * 180, positionY: order % 2 ? 220 : 80 } })));
  for (let index = 0; index < nodes.length - 1; index += 1) {
    await db.researchTrailConnection.create({ data: { trailId, sourceId: nodes[index].id, targetId: nodes[index + 1].id, label: "then" } });
  }

  console.log(`Seeded ${signalSeeds.length} signals, ${frequencySeeds.length} frequencies, and 1 trail for @${ownerUsername}.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
