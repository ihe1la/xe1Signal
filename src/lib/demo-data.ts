export type DemoSignalType =
  | "IMAGE"
  | "LINK"
  | "NOTE"
  | "SONG"
  | "CODE"
  | "SCREENSHOT"
  | "AUDIO"
  | "DOCUMENT"
  | "FILE";

export type SignalAttachment = {
  id: string;
  url: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  thumbnailUrl?: string | null;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
};

export type DemoUser = {
  id: string;
  username: string;
  name: string;
  bio: string;
  avatarUrl: string;
  bannerUrl?: string | null;
  strength: number;
  followerCount?: number;
  followingCount?: number;
  isFollowing?: boolean;
};

export type DemoFrequency = {
  id: string;
  name: string;
  description: string;
  color: string;
  signalCount: number;
  followerCount: number;
  tags: string[];
  owner: DemoUser;
};

export type DemoSignal = {
  id: string;
  type: DemoSignalType;
  title: string;
  description?: string;
  content?: string;
  sourceUrl?: string;
  mediaProvider?: "youtube" | "spotify" | "audius" | null;
  mediaEntityType?: string | null;
  externalId?: string | null;
  providerUri?: string | null;
  creatorName?: string | null;
  thumbnailUrl?: string | null;
  durationMs?: number | null;
  sourceDomain?: string;
  previewImageUrl?: string;
  artist?: string;
  duration?: string;
  language?: string;
  tags: string[];
  visibility: "PUBLIC" | "PRIVATE" | "UNLISTED";
  signalStrength: number;
  reactionCount: number;
  commentCount: number;
  saveCount: number;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  isSaved?: boolean;
  isReacted?: boolean;
  owner: DemoUser;
  frequency?: Pick<DemoFrequency, "id" | "name">;
  files?: SignalAttachment[];
};

export const helaOwner: DemoUser = {
  id: "user-hela",
  username: "hela",
  name: "hela",
  bio: "Fragments from the archive.",
  avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80",
  strength: 84,
};

export const demoUsers: DemoUser[] = [helaOwner];

export const demoFrequencies: DemoFrequency[] = [
  {
    id: "sample-ihe1la-songs-that-hurt",
    name: "Songs that hurt",
    description: "Songs for low light and private rooms.",
    color: "#8f7be9",
    signalCount: 2,
    followerCount: 12,
    tags: ["music", "blue", "night"],
    owner: helaOwner,
  },
  {
    id: "sample-ihe1la-beautiful-interfaces",
    name: "Beautiful interfaces",
    description: "Dark surfaces, precise spacing, and soft violet light.",
    color: "#c084fc",
    signalCount: 3,
    followerCount: 8,
    tags: ["design", "interfaces", "dark"],
    owner: helaOwner,
  },
];

const now = Date.now();

export const demoSignals: DemoSignal[] = [
  {
    id: "sample-showcase-tokyo",
    type: "IMAGE",
    title: "Tokyo Nights",
    description: "Neon rain and midnight glass.",
    previewImageUrl:
      "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1200&q=80",
    sourceUrl: "https://unsplash.com/",
    sourceDomain: "unsplash.com",
    tags: ["tokyo", "neon", "night"],
    visibility: "PUBLIC",
    signalStrength: 92,
    reactionCount: 24,
    commentCount: 6,
    saveCount: 11,
    viewCount: 320,
    createdAt: new Date(now - 1000).toISOString(),
    updatedAt: new Date(now - 1000).toISOString(),
    owner: helaOwner,
    frequency: { id: "sample-ihe1la-beautiful-interfaces", name: "Beautiful interfaces" },
  },
  {
    id: "sample-showcase-midnight-drive",
    type: "SONG",
    title: "Midnight Drive",
    description: "Kavinsky",
    artist: "Kavinsky",
    creatorName: "Kavinsky",
    duration: "03:42",
    durationMs: 222000,
    thumbnailUrl:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=600&q=80",
    previewImageUrl:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=600&q=80",
    tags: ["synthwave", "night", "drive"],
    visibility: "PUBLIC",
    signalStrength: 88,
    reactionCount: 41,
    commentCount: 9,
    saveCount: 18,
    viewCount: 510,
    createdAt: new Date(now - 2000).toISOString(),
    updatedAt: new Date(now - 2000).toISOString(),
    owner: helaOwner,
    frequency: { id: "sample-ihe1la-songs-that-hurt", name: "Songs that hurt" },
  },
  {
    id: "sample-ihe1la-login-code",
    type: "CODE",
    title: "Return the session, not the promise",
    description: "The smallest useful version of the login boundary.",
    content:
      "async function login(creds) {\n  const session = await auth(creds)\n  if (!session?.user) throw new Error('no signal')\n  return session.user\n}",
    language: "javascript",
    tags: ["typescript", "auth", "session"],
    visibility: "PUBLIC",
    signalStrength: 86,
    reactionCount: 17,
    commentCount: 4,
    saveCount: 13,
    viewCount: 240,
    createdAt: new Date(now - 3000).toISOString(),
    updatedAt: new Date(now - 3000).toISOString(),
    owner: helaOwner,
  },
  {
    id: "sample-showcase-ux-link",
    type: "LINK",
    title: "Designing for quiet attention",
    description: "How soft interfaces keep people without shouting for them.",
    sourceUrl: "https://uxdesign.cc/",
    sourceDomain: "uxdesign.cc",
    tags: ["ux", "attention", "design"],
    visibility: "PUBLIC",
    signalStrength: 81,
    reactionCount: 12,
    commentCount: 3,
    saveCount: 8,
    viewCount: 190,
    createdAt: new Date(now - 4000).toISOString(),
    updatedAt: new Date(now - 4000).toISOString(),
    owner: helaOwner,
  },
  {
    id: "sample-showcase-signal-note",
    type: "NOTE",
    title: "Ideas for the new signal system",
    content:
      "• Keep cards compact and editorial\n• Type labels stay quiet but purple\n• Filters should feel like pills, not tabs\n• Right panel stays thin and contextual",
    tags: ["product", "notes", "signals"],
    visibility: "PUBLIC",
    signalStrength: 79,
    reactionCount: 8,
    commentCount: 2,
    saveCount: 7,
    viewCount: 140,
    createdAt: new Date(now - 5000).toISOString(),
    updatedAt: new Date(now - 5000).toISOString(),
    owner: helaOwner,
  },
  {
    id: "sample-showcase-analytics",
    type: "SCREENSHOT",
    title: "Analytics Dashboard",
    description: "Sparse charts, graphite panels, muted violet marks.",
    previewImageUrl:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80",
    tags: ["dashboard", "analytics", "ui"],
    visibility: "PUBLIC",
    signalStrength: 77,
    reactionCount: 15,
    commentCount: 5,
    saveCount: 9,
    viewCount: 210,
    createdAt: new Date(now - 6000).toISOString(),
    updatedAt: new Date(now - 6000).toISOString(),
    owner: helaOwner,
    frequency: { id: "sample-ihe1la-beautiful-interfaces", name: "Beautiful interfaces" },
  },
  {
    id: "sample-showcase-design-pdf",
    type: "DOCUMENT",
    title: "Design Principles That Matter",
    description: "2.4 MB",
    content: "A short field guide to density, contrast, and quiet hierarchy.",
    tags: ["pdf", "design", "principles"],
    visibility: "PUBLIC",
    signalStrength: 74,
    reactionCount: 6,
    commentCount: 1,
    saveCount: 10,
    viewCount: 98,
    createdAt: new Date(now - 7000).toISOString(),
    updatedAt: new Date(now - 7000).toISOString(),
    owner: helaOwner,
    files: [
      {
        id: "sample-showcase-design-pdf-file",
        url: "#",
        filename: "design-principles.pdf",
        originalName: "Design Principles That Matter.pdf",
        mimeType: "application/pdf",
        size: 2516582,
      },
    ],
  },
  {
    id: "sample-showcase-voice",
    type: "AUDIO",
    title: "Voice memo",
    description: "A short capture from the archive.",
    duration: "00:28",
    durationMs: 28000,
    tags: ["voice", "memo"],
    visibility: "PUBLIC",
    signalStrength: 71,
    reactionCount: 4,
    commentCount: 0,
    saveCount: 3,
    viewCount: 66,
    createdAt: new Date(now - 8000).toISOString(),
    updatedAt: new Date(now - 8000).toISOString(),
    owner: helaOwner,
  },
  {
    id: "sample-showcase-github",
    type: "LINK",
    title: "xe1Signal",
    description: "Signal Archive — keep the fragments that still matter.",
    sourceUrl: "https://github.com/ihe1la/xe1Signal",
    sourceDomain: "github.com",
    tags: ["github", "repo", "xe1signal"],
    visibility: "PUBLIC",
    signalStrength: 90,
    reactionCount: 33,
    commentCount: 7,
    saveCount: 22,
    viewCount: 640,
    createdAt: new Date(now - 9000).toISOString(),
    updatedAt: new Date(now - 9000).toISOString(),
    owner: helaOwner,
  },
  {
    id: "sample-ihe1la-blue",
    type: "SONG",
    title: "BLUE",
    description: "Billie Eilish",
    artist: "Billie Eilish",
    creatorName: "Billie Eilish",
    duration: "01:51",
    durationMs: 111000,
    thumbnailUrl:
      "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&w=600&q=80",
    previewImageUrl:
      "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&w=600&q=80",
    tags: ["billie eilish", "blue", "night"],
    visibility: "PUBLIC",
    signalStrength: 95,
    reactionCount: 52,
    commentCount: 11,
    saveCount: 27,
    viewCount: 880,
    createdAt: new Date(now - 10000).toISOString(),
    updatedAt: new Date(now - 10000).toISOString(),
    owner: helaOwner,
    frequency: { id: "sample-ihe1la-songs-that-hurt", name: "Songs that hurt" },
  },
];

export const demoTrail: string[] = ["BLUE", "Tokyo Nights", "Midnight Drive", "idea at 3am"];

export function findSignal(id: string) {
  return demoSignals.find((signal) => signal.id === id);
}

export function findFrequency(id: string) {
  return demoFrequencies.find((frequency) => frequency.id === id);
}
