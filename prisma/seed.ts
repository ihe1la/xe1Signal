import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const UserRole = { OWNER: "OWNER", USER: "USER", MODERATOR: "MODERATOR" } as const;
type UserRole = string;
const SignalType = { IMAGE: "IMAGE", LINK: "LINK", SONG: "SONG", NOTE: "NOTE", SCREENSHOT: "SCREENSHOT", CODE: "CODE", AUDIO: "AUDIO", DOCUMENT: "DOCUMENT" } as const;
const ReactionType = { HEART: "HEART", STAR: "STAR" } as const;
const NotificationType = { REACTION: "REACTION", COMMENT: "COMMENT", FOLLOW: "FOLLOW" } as const;

const prisma = new PrismaClient();
const password = "Archive!2026";

async function main() {
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.deleteMany();

  const users = await Promise.all([
    ["hela", "hela@signal.local", "Collecting quiet interfaces, broken paths, and things worth returning to.", UserRole.OWNER],
    ["test", "test@signal.local", "A private test account for checking sharing and account boundaries.", UserRole.USER],
  ].map(([username, email, bio, role]) => prisma.user.create({ data: { id: String(username), username: String(username), email: String(email), name: String(username), displayName: String(username), bio: String(bio), role: role as UserRole, passwordHash, avatarUrl: `https://api.dicebear.com/9.x/notionists-neutral/svg?seed=${username}&backgroundColor=111116`, emailVerified: new Date(), settings: { create: {} } } })));
  const [hela, testUser] = users;
  const voidUser = testUser;
  const milo = testUser;
  const ghost = testUser;

  const frequencyRows = [
    ["late-night-thoughts", "Late-night thoughts", "Fragments that arrive after the room goes quiet.", hela.id, ["notes", "night"]],
    ["web-weirdness", "Web weirdness", "Odd corners, delightful accidents, and small internet mysteries.", voidUser.id, ["web", "culture"]],
    ["broken-flows", "Broken flows", "Interfaces that reveal themselves when something goes wrong.", hela.id, ["ux", "auth"]],
    ["beautiful-interfaces", "Beautiful interfaces", "Restraint, rhythm, and tiny moments of care.", milo.id, ["design", "ui"]],
    ["songs-that-hurt", "Songs that hurt", "For headphones, rain, and long walks home.", hela.id, ["music"]],
    ["auth-research", "Auth research", "Identity patterns and sign-in journeys worth studying.", hela.id, ["identity", "patterns"]],
    ["unfinished-ideas", "Unfinished ideas", "Good beginnings without endings yet.", ghost.id, ["ideas"]],
    ["rooms-i-want", "Rooms I want", "Light, texture, quiet, and somewhere to read.", milo.id, ["spaces"]],
    ["strange-websites", "Strange websites", "The handmade and unclassifiable web.", voidUser.id, ["web"]],
    ["read-later", "Read later", "A hopeful queue of essays and references.", hela.id, ["reading"]],
  ] as const;
  const frequencies = await Promise.all(frequencyRows.map(([id, name, description, ownerId, tags]) => prisma.frequency.create({ data: { id, name, description, ownerId, tags: tags.join(",") } })));
  const frequency = Object.fromEntries(frequencies.map((item) => [item.id, item]));

  const signalRows = [
    { id: "tokyo-textures", type: SignalType.IMAGE, title: "Tokyo textures", description: "Shadows and shapes.", ownerId: hela.id, frequencyId: frequency["beautiful-interfaces"].id, previewImageUrl: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1200&q=82", tags: ["architecture", "light"], saveCount: 132 },
    { id: "art-of-noticing", type: SignalType.LINK, title: "The Art of Noticing", description: "A field guide to paying attention to the ordinary.", ownerId: voidUser.id, frequencyId: frequency["read-later"].id, sourceUrl: "https://nesslabs.com/the-art-of-noticing", sourceDomain: "nesslabs.com", previewImageUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=82", tags: ["attention", "essay"], saveCount: 89 },
    { id: "blue", type: SignalType.SONG, title: "Blue", description: "Billie Eilish", content: "Billie Eilish · 2:30", ownerId: hela.id, frequencyId: frequency["songs-that-hurt"].id, tags: ["headphones", "blue"], saveCount: 201 },
    { id: "oauth-trust", type: SignalType.NOTE, title: "OAuth is just trust with better formatting.", content: "OAuth is just trust with better formatting.\n\nThe interface is a promise about who may act, for whom, and for how long.", ownerId: hela.id, frequencyId: frequency["auth-research"].id, tags: ["oauth", "identity"], saveCount: 154 },
    { id: "clean-login-flow", type: SignalType.SCREENSHOT, title: "Clean login flow", description: "One decision per screen, with recovery always in reach.", ownerId: milo.id, frequencyId: frequency["beautiful-interfaces"].id, previewImageUrl: "https://images.unsplash.com/photo-1558655146-9f40138edfeb?auto=format&fit=crop&w=1200&q=82", tags: ["login", "interface"], saveCount: 97 },
    { id: "login-function", type: SignalType.CODE, title: "A kinder login request", content: "async function login(email: string, password: string) {\n  const response = await fetch('/api/auth/login', { method: 'POST' });\n  if (!response.ok) throw new Error('Unable to sign in');\n  return response.json();\n}", ownerId: hela.id, frequencyId: frequency["auth-research"].id, tags: ["typescript", "auth"], saveCount: 173 },
    { id: "interesting-404s", type: SignalType.LINK, title: "A List of Interesting 404s", description: "Proof that dead ends can still have personality.", ownerId: ghost.id, frequencyId: frequency["web-weirdness"].id, sourceUrl: "https://404.gallery", sourceDomain: "404.gallery", tags: ["404", "web"], saveCount: 63 },
    { id: "seoul-nights", type: SignalType.IMAGE, title: "Seoul nights", description: "Rain turns every sign into a second city.", ownerId: milo.id, frequencyId: frequency["late-night-thoughts"].id, previewImageUrl: "https://images.unsplash.com/photo-1538485399081-7191377e8241?auto=format&fit=crop&w=1200&q=82", tags: ["seoul", "night"], saveCount: 111 },
    { id: "idea-at-3am", type: SignalType.AUDIO, title: "idea at 3am", description: "A voice memo about archives that remember context, not just links.", ownerId: hela.id, frequencyId: frequency["unfinished-ideas"].id, tags: ["voice", "idea"], saveCount: 88 },
    { id: "strange-redirect", type: SignalType.SCREENSHOT, title: "Strange redirect after login", description: "The callback lands on a half-rendered memory of the previous page.", ownerId: hela.id, frequencyId: frequency["broken-flows"].id, previewImageUrl: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=82", tags: ["redirect", "login"], saveCount: 76 },
    { id: "almost-worked", type: SignalType.NOTE, title: "Things that almost worked", content: "A good archive should make returning feel as natural as saving.", ownerId: voidUser.id, frequencyId: frequency["unfinished-ideas"].id, tags: ["product", "notes"], saveCount: 31 },
    { id: "saved-for-later", type: SignalType.DOCUMENT, title: "Saved for later", description: "Interface patterns for calm information spaces.pdf", ownerId: ghost.id, frequencyId: frequency["read-later"].id, tags: ["pdf", "reference"], saveCount: 54 },
    { id: "empty-streets", type: SignalType.IMAGE, title: "Empty streets", description: "The city before the first train.", ownerId: milo.id, frequencyId: frequency["late-night-thoughts"].id, previewImageUrl: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1200&q=82", tags: ["city", "quiet"], saveCount: 71 },
  ];
  const signals = await Promise.all(signalRows.map((row, index) => prisma.signal.create({ data: { ...row, tags: row.tags.join(","), signalStrength: 48 + (index * 7) % 45, reactionCount: 12 + index * 3, commentCount: 2 + (index % 5), viewCount: 120 + index * 37, frequencyOrder: index } })));
  await Promise.all(frequencies.map((item) => prisma.frequency.update({ where: { id: item.id }, data: { signalCount: signals.filter((signal) => signal.frequencyId === item.id).length } })));

  await prisma.follow.createMany({ data: [{ followerId: hela.id, followingId: testUser.id }, { followerId: testUser.id, followingId: hela.id }] });
  await prisma.savedSignal.createMany({ data: signals.slice(0, 6).map((signal) => ({ userId: hela.id, signalId: signal.id })) });
  await prisma.reaction.createMany({ data: signals.slice(0, 8).map((signal, index) => ({ userId: index % 2 ? milo.id : voidUser.id, signalId: signal.id, type: index % 2 ? ReactionType.HEART : ReactionType.STAR })) });
  await prisma.comment.create({ data: { userId: voidUser.id, signalId: "oauth-trust", content: "The kind of fragment that changes how you notice the next interface.", replies: { create: { userId: hela.id, signalId: "oauth-trust", content: "Exactly — the promise matters more than the protocol diagram." } } } });
  await prisma.message.createMany({ data: [{ senderId: testUser.id, receiverId: hela.id, content: "That Seoul set is perfect for the frequency." }, { senderId: hela.id, receiverId: testUser.id, content: "I keep returning to the reflections in the second frame." }] });
  await prisma.notification.createMany({ data: [{ userId: hela.id, type: NotificationType.REACTION, title: "New reaction", message: "test reacted to Tokyo textures", data: JSON.stringify({ signalId: "tokyo-textures" }) }, { userId: hela.id, type: NotificationType.COMMENT, title: "New reply", message: "test replied to your OAuth note", data: JSON.stringify({ signalId: "oauth-trust" }) }, { userId: hela.id, type: NotificationType.FOLLOW, title: "New follower", message: "test started following you", data: JSON.stringify({ username: "test" }) }] });
  const trail = await prisma.researchTrail.create({ data: { id: "oauth-login", ownerId: hela.id, title: "The login path", description: "From the first interface to the callback that returns the user.", visibility: "SHARED", nodeCount: 6 } });
  const nodeTitles = ["Login page", "JS bundle", "API endpoint", "OAuth callback", "Interesting behavior", "Notes"];
  const nodes = await Promise.all(nodeTitles.map((title, index) => prisma.researchTrailNode.create({ data: { trailId: trail.id, type: index === 5 ? "NOTE" : "SIGNAL", title, positionX: 60 + index * 155, positionY: 90 + (index % 2) * 120, order: index, signalId: index === 0 ? "clean-login-flow" : index === 3 ? "strange-redirect" : null } })));
  await prisma.researchTrailConnection.createMany({ data: nodes.slice(0, -1).map((node, index) => ({ trailId: trail.id, sourceId: node.id, targetId: nodes[index + 1].id, label: index === 2 ? "returns to" : null })) });
  console.log(`Seeded Signal Archive. Demo logins: hela@signal.local and test@signal.local / ${password}`);
}

main().catch((error) => { console.error(error); process.exit(1); }).finally(async () => prisma.$disconnect());
