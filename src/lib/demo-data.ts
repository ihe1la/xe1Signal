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
  owner: DemoUser;
  frequency?: Pick<DemoFrequency, "id" | "name">;
  files?: SignalAttachment[];
};

const avatar = (seed: string) =>
  `https://api.dicebear.com/9.x/notionists-neutral/svg?seed=${seed}&backgroundColor=111116`;

export const demoUsers: DemoUser[] = [
  { id: "hela", username: "hela", name: "hela", bio: "Collecting quiet interfaces, broken paths, and things worth returning to.", avatarUrl: avatar("hela"), strength: 76 },
  { id: "test", username: "test", name: "test", bio: "A private test account for checking sharing and account boundaries.", avatarUrl: avatar("test"), strength: 58 },
];

const [hela, testUser] = demoUsers;
const voidUser = testUser;
const milo = testUser;
const ghost = testUser;

export const demoFrequencies: DemoFrequency[] = [
  { id: "late-night-thoughts", name: "Late-night thoughts", description: "Fragments that arrive after the room goes quiet.", color: "#7d9be8", signalCount: 47, followerCount: 18, tags: ["notes", "night"], owner: hela },
  { id: "web-weirdness", name: "Web weirdness", description: "Odd corners, delightful accidents, and small internet mysteries.", color: "#9180aa", signalCount: 23, followerCount: 31, tags: ["web", "culture"], owner: voidUser },
  { id: "broken-flows", name: "Broken flows", description: "Interfaces that reveal themselves when something goes wrong.", color: "#e0b36a", signalCount: 23, followerCount: 42, tags: ["ux", "auth"], owner: hela },
  { id: "beautiful-interfaces", name: "Beautiful interfaces", description: "Restraint, rhythm, and tiny moments of care.", color: "#aa9292", signalCount: 56, followerCount: 89, tags: ["design", "ui"], owner: milo },
  { id: "songs-that-hurt", name: "Songs that hurt", description: "For headphones, rain, and long walks home.", color: "#ef695d", signalCount: 34, followerCount: 71, tags: ["music"], owner: hela },
  { id: "auth-research", name: "Auth research", description: "Identity patterns and sign-in journeys worth studying.", color: "#b5aa93", signalCount: 12, followerCount: 15, tags: ["identity", "patterns"], owner: hela },
  { id: "unfinished-ideas", name: "Unfinished ideas", description: "Good beginnings without endings yet.", color: "#76a29e", signalCount: 17, followerCount: 9, tags: ["ideas"], owner: ghost },
  { id: "rooms-i-want", name: "Rooms I want", description: "Light, texture, quiet, and somewhere to read.", color: "#857399", signalCount: 8, followerCount: 27, tags: ["spaces"], owner: milo },
  { id: "strange-websites", name: "Strange websites", description: "The handmade and unclassifiable web.", color: "#89978a", signalCount: 41, followerCount: 38, tags: ["web"], owner: voidUser },
  { id: "read-later", name: "Read later", description: "A hopeful queue of essays and references.", color: "#8296b0", signalCount: 112, followerCount: 5, tags: ["reading"], owner: hela },
];

const iso = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();

export const demoSignals: DemoSignal[] = [
  { id: "tokyo-textures", type: "IMAGE", title: "Tokyo textures", description: "Shadows and shapes.", previewImageUrl: "/media/tokyo.svg", tags: ["architecture", "light"], visibility: "PUBLIC", signalStrength: 78, reactionCount: 34, commentCount: 7, saveCount: 132, viewCount: 491, createdAt: iso(2), updatedAt: iso(2), owner: hela, frequency: { id: "beautiful-interfaces", name: "Beautiful interfaces" } },
  { id: "art-of-noticing", type: "LINK", title: "The Art of Noticing", description: "A field guide to paying attention to the ordinary.", sourceUrl: "https://nesslabs.com/the-art-of-noticing", sourceDomain: "nesslabs.com", previewImageUrl: "/media/coast.svg", tags: ["attention", "essay"], visibility: "PUBLIC", signalStrength: 66, reactionCount: 22, commentCount: 4, saveCount: 89, viewCount: 312, createdAt: iso(4), updatedAt: iso(4), owner: voidUser, frequency: { id: "read-later", name: "Read later" } },
  { id: "blue", type: "SONG", title: "Blue", artist: "Billie Eilish", description: "Billie Eilish", duration: "2:30", tags: ["headphones", "blue"], visibility: "PUBLIC", signalStrength: 91, reactionCount: 51, commentCount: 12, saveCount: 201, viewCount: 704, createdAt: iso(5), updatedAt: iso(5), owner: hela, frequency: { id: "songs-that-hurt", name: "Songs that hurt" } },
  { id: "oauth-trust", type: "NOTE", title: "OAuth is just trust with better formatting.", content: "OAuth is just trust with better formatting.\n\nThe interface is a promise about who may act, for whom, and for how long.", tags: ["oauth", "identity"], visibility: "PUBLIC", signalStrength: 82, reactionCount: 44, commentCount: 16, saveCount: 154, viewCount: 620, createdAt: iso(7), updatedAt: iso(7), owner: hela, frequency: { id: "auth-research", name: "Auth research" } },
  { id: "clean-login-flow", type: "SCREENSHOT", title: "Clean login flow", description: "One decision per screen, with recovery always in reach.", previewImageUrl: "/media/login.svg", tags: ["login", "interface"], visibility: "PUBLIC", signalStrength: 70, reactionCount: 29, commentCount: 6, saveCount: 97, viewCount: 338, createdAt: iso(9), updatedAt: iso(9), owner: milo, frequency: { id: "beautiful-interfaces", name: "Beautiful interfaces" } },
  { id: "login-function", type: "CODE", title: "A kinder login request", description: "A small request wrapper with useful errors.", language: "typescript", content: "async function login(email: string, password: string) {\n  const response = await fetch('/api/auth/login', {\n    method: 'POST',\n    headers: { 'content-type': 'application/json' },\n    body: JSON.stringify({ email, password }),\n  });\n\n  if (!response.ok) throw new Error('Unable to sign in');\n  return response.json();\n}", tags: ["typescript", "auth"], visibility: "PUBLIC", signalStrength: 73, reactionCount: 39, commentCount: 11, saveCount: 173, viewCount: 477, createdAt: iso(11), updatedAt: iso(11), owner: hela, frequency: { id: "auth-research", name: "Auth research" } },
  { id: "interesting-404s", type: "LINK", title: "A List of Interesting 404s", description: "Proof that dead ends can still have personality.", sourceUrl: "https://404.gallery", sourceDomain: "404.gallery", tags: ["404", "web"], visibility: "PUBLIC", signalStrength: 58, reactionCount: 18, commentCount: 3, saveCount: 63, viewCount: 201, createdAt: iso(14), updatedAt: iso(14), owner: ghost, frequency: { id: "web-weirdness", name: "Web weirdness" } },
  { id: "seoul-nights", type: "IMAGE", title: "Seoul nights", description: "Rain turns every sign into a second city.", previewImageUrl: "/media/seoul.svg", tags: ["seoul", "night"], visibility: "PUBLIC", signalStrength: 74, reactionCount: 33, commentCount: 8, saveCount: 111, viewCount: 410, createdAt: iso(19), updatedAt: iso(19), owner: milo, frequency: { id: "late-night-thoughts", name: "Late-night thoughts" } },
  { id: "idea-at-3am", type: "AUDIO", title: "idea at 3am", description: "A voice memo about archives that remember context, not just links.", duration: "0:42", tags: ["voice", "idea"], visibility: "UNLISTED", signalStrength: 55, reactionCount: 13, commentCount: 2, saveCount: 88, viewCount: 179, createdAt: iso(23), updatedAt: iso(23), owner: hela, frequency: { id: "unfinished-ideas", name: "Unfinished ideas" } },
  { id: "strange-redirect", type: "SCREENSHOT", title: "Strange redirect after login", description: "The callback lands on a half-rendered memory of the previous page.", previewImageUrl: "/media/login.svg", tags: ["redirect", "login"], visibility: "PUBLIC", signalStrength: 69, reactionCount: 24, commentCount: 9, saveCount: 76, viewCount: 284, createdAt: iso(27), updatedAt: iso(27), owner: hela, frequency: { id: "broken-flows", name: "Broken flows" } },
  { id: "almost-worked", type: "NOTE", title: "Things that almost worked", content: "A good archive should make returning feel as natural as saving.", tags: ["product", "notes"], visibility: "PRIVATE", signalStrength: 49, reactionCount: 8, commentCount: 2, saveCount: 31, viewCount: 96, createdAt: iso(32), updatedAt: iso(32), owner: voidUser, frequency: { id: "unfinished-ideas", name: "Unfinished ideas" } },
  { id: "saved-for-later", type: "DOCUMENT", title: "Saved for later", description: "Interface patterns for calm information spaces.pdf", tags: ["pdf", "reference"], visibility: "PUBLIC", signalStrength: 42, reactionCount: 10, commentCount: 1, saveCount: 54, viewCount: 140, createdAt: iso(40), updatedAt: iso(40), owner: ghost, frequency: { id: "read-later", name: "Read later" } },
  { id: "empty-streets", type: "IMAGE", title: "Empty streets", description: "The city before the first train.", previewImageUrl: "/media/streets.svg", tags: ["city", "quiet"], visibility: "PUBLIC", signalStrength: 61, reactionCount: 19, commentCount: 5, saveCount: 71, viewCount: 213, createdAt: iso(48), updatedAt: iso(48), owner: milo, frequency: { id: "late-night-thoughts", name: "Late-night thoughts" } },
];

export const demoTrail = [
  "Login page",
  "JS bundle",
  "API endpoint",
  "OAuth callback",
  "Interesting behavior",
  "Notes",
];

export function findSignal(id: string) {
  return demoSignals.find((signal) => signal.id === id);
}

export function findFrequency(id: string) {
  return demoFrequencies.find((frequency) => frequency.id === id);
}
