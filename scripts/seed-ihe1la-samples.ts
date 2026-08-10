import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const ownerUsernames = ["ihe1la", "hela"] as const;

const frequencySeeds = [
  {
    id: "sample-ihe1la-late-night",
    name: "Late-night thoughts",
    description: "Quiet fragments collected after midnight.",
    tags: "night,private,thoughts",
  },
  {
    id: "sample-ihe1la-broken-flows",
    name: "Broken flows",
    description: "Auth edges, strange redirects, and beautiful failures.",
    tags: "code,auth,debugging",
  },
  {
    id: "sample-ihe1la-beautiful-interfaces",
    name: "Beautiful interfaces",
    description: "Dark surfaces, precise spacing, and soft violet light.",
    tags: "design,interfaces,dark",
  },
  {
    id: "sample-ihe1la-songs-that-hurt",
    name: "Songs that hurt",
    description: "Songs for low light and private rooms.",
    tags: "music,blue,night",
  },
];

const signalSeeds = [
  {
    id: "sample-showcase-tokyo",
    type: "IMAGE",
    title: "Tokyo Nights",
    description: "Neon rain and midnight glass.",
    previewImageUrl:
      "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1200&q=80",
    sourceUrl: "https://unsplash.com/",
    sourceDomain: "unsplash.com",
    tags: "tokyo,neon,night",
    frequencyId: "sample-ihe1la-beautiful-interfaces",
    reactionCount: 24,
    commentCount: 6,
    saveCount: 11,
  },
  {
    id: "sample-showcase-midnight-drive",
    type: "SONG",
    title: "Midnight Drive",
    description: "Kavinsky",
    creatorName: "Kavinsky",
    durationMs: 222000,
    thumbnailUrl:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=600&q=80",
    previewImageUrl:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=600&q=80",
    tags: "synthwave,night,drive",
    frequencyId: "sample-ihe1la-songs-that-hurt",
    reactionCount: 41,
    commentCount: 9,
    saveCount: 18,
  },
  {
    id: "sample-ihe1la-login-code",
    type: "CODE",
    title: "Return the session, not the promise",
    description: "The smallest useful version of the login boundary.",
    content:
      "async function login(creds) {\n  const session = await auth(creds)\n  if (!session?.user) throw new Error('no signal')\n  return session.user\n}",
    tags: "typescript,auth,session",
    frequencyId: "sample-ihe1la-broken-flows",
    reactionCount: 17,
    commentCount: 4,
    saveCount: 13,
  },
  {
    id: "sample-showcase-ux-link",
    type: "LINK",
    title: "Designing for quiet attention",
    description: "How soft interfaces keep people without shouting for them.",
    sourceUrl: "https://uxdesign.cc/",
    sourceDomain: "uxdesign.cc",
    tags: "ux,attention,design",
    frequencyId: "sample-ihe1la-beautiful-interfaces",
    reactionCount: 12,
    commentCount: 3,
    saveCount: 8,
  },
  {
    id: "sample-showcase-signal-note",
    type: "NOTE",
    title: "Ideas for the new signal system",
    content:
      "• Keep cards compact and editorial\n• Type labels stay quiet but purple\n• Filters should feel like pills, not tabs\n• Right panel stays thin and contextual",
    tags: "product,notes,signals",
    frequencyId: "sample-ihe1la-late-night",
    reactionCount: 8,
    commentCount: 2,
    saveCount: 7,
  },
  {
    id: "sample-showcase-analytics",
    type: "SCREENSHOT",
    title: "Analytics Dashboard",
    description: "Sparse charts, graphite panels, muted violet marks.",
    previewImageUrl:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80",
    tags: "dashboard,analytics,ui",
    frequencyId: "sample-ihe1la-beautiful-interfaces",
    reactionCount: 15,
    commentCount: 5,
    saveCount: 9,
  },
  {
    id: "sample-showcase-design-pdf",
    type: "DOCUMENT",
    title: "Design Principles That Matter",
    description: "2.4 MB",
    content: "A short field guide to density, contrast, and quiet hierarchy.",
    tags: "pdf,design,principles",
    frequencyId: "sample-ihe1la-late-night",
    reactionCount: 6,
    commentCount: 1,
    saveCount: 10,
  },
  {
    id: "sample-showcase-voice",
    type: "AUDIO",
    title: "Voice memo",
    description: "A short capture from the archive.",
    durationMs: 28000,
    tags: "voice,memo",
    frequencyId: "sample-ihe1la-late-night",
    reactionCount: 4,
    commentCount: 0,
    saveCount: 3,
  },
  {
    id: "sample-showcase-github",
    type: "LINK",
    title: "xe1Signal",
    description: "Signal Archive — keep the fragments that still matter.",
    sourceUrl: "https://github.com/ihe1la/xe1Signal",
    sourceDomain: "github.com",
    tags: "github,repo,xe1signal",
    frequencyId: "sample-ihe1la-broken-flows",
    reactionCount: 33,
    commentCount: 7,
    saveCount: 22,
  },
  {
    id: "sample-ihe1la-blue",
    type: "SONG",
    title: "BLUE",
    description: "Billie Eilish",
    creatorName: "Billie Eilish",
    durationMs: 111000,
    thumbnailUrl:
      "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&w=600&q=80",
    previewImageUrl:
      "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&w=600&q=80",
    tags: "billie eilish,blue,night",
    frequencyId: "sample-ihe1la-songs-that-hurt",
    reactionCount: 52,
    commentCount: 11,
    saveCount: 27,
  },
] as const;

async function main() {
  let owner: { id: string; username: string } | null = null;
  for (const username of ownerUsernames) {
    owner = await db.user.findUnique({
      where: { username },
      select: { id: true, username: true },
    });
    if (owner) break;
  }
  if (!owner) throw new Error(`No owner found among ${ownerUsernames.join(", ")}`);

  for (const frequency of frequencySeeds) {
    await db.frequency.upsert({
      where: { id: frequency.id },
      create: { ...frequency, ownerId: owner.id, visibility: "PUBLIC" },
      update: {
        name: frequency.name,
        description: frequency.description,
        tags: frequency.tags,
        ownerId: owner.id,
        visibility: "PUBLIC",
        isArchived: false,
      },
    });
  }

  const seededAt = Date.now();
  for (const [index, signal] of signalSeeds.entries()) {
    const data = {
      ...signal,
      ownerId: owner.id,
      visibility: "PUBLIC",
      isArchived: false,
      isDeleted: false,
      isDraft: false,
      signalStrength: 95 - index * 2,
      createdAt: new Date(seededAt - index * 1000),
    };
    await db.signal.upsert({
      where: { id: signal.id },
      create: data,
      update: data,
    });
  }

  await db.signalFile.upsert({
    where: { id: "sample-showcase-design-pdf-file" },
    create: {
      id: "sample-showcase-design-pdf-file",
      signalId: "sample-showcase-design-pdf",
      filename: "design-principles.pdf",
      originalName: "Design Principles That Matter.pdf",
      mimeType: "application/pdf",
      size: 2516582,
      url: "#",
    },
    update: {
      signalId: "sample-showcase-design-pdf",
      originalName: "Design Principles That Matter.pdf",
      mimeType: "application/pdf",
      size: 2516582,
      url: "#",
    },
  });

  await db.signalFile.upsert({
    where: { id: "sample-ihe1la-blue-file" },
    create: {
      id: "sample-ihe1la-blue-file",
      signalId: "sample-ihe1la-blue",
      filename: "c910e803-a4b8-432c-806b-ec0fc49f3e9c.mp3",
      originalName: "Billie Eilish - BLUE.mp3",
      mimeType: "audio/mpeg",
      size: 4438125,
      duration: 110.928,
      url: "/api/files/c910e803-a4b8-432c-806b-ec0fc49f3e9c.mp3",
    },
    update: {
      signalId: "sample-ihe1la-blue",
      originalName: "Billie Eilish - BLUE.mp3",
      mimeType: "audio/mpeg",
      size: 4438125,
      duration: 110.928,
      url: "/api/files/c910e803-a4b8-432c-806b-ec0fc49f3e9c.mp3",
    },
  });

  for (const frequency of frequencySeeds) {
    const signalCount = await db.signal.count({
      where: { frequencyId: frequency.id, isDeleted: false, isArchived: false },
    });
    await db.frequency.update({
      where: { id: frequency.id },
      data: { signalCount },
    });
  }

  const trailId = "sample-ihe1la-first-trail";
  await db.researchTrail.upsert({
    where: { id: trailId },
    create: {
      id: trailId,
      ownerId: owner.id,
      title: "My first trail",
      description: "Empty trail · add your first node",
      visibility: "PRIVATE",
      nodeCount: 0,
    },
    update: {
      ownerId: owner.id,
      title: "My first trail",
      description: "Empty trail · add your first node",
      visibility: "PRIVATE",
      nodeCount: 0,
      isArchived: false,
    },
  });
  await db.researchTrailConnection.deleteMany({ where: { trailId } });
  await db.researchTrailNode.deleteMany({ where: { trailId } });

  console.log(
    `Seeded ${signalSeeds.length} showcase signals, ${frequencySeeds.length} frequencies, and trail for @${owner.username}.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
