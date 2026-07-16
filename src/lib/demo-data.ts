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
  mediaProvider?: "youtube" | "spotify" | null;
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
  owner: DemoUser;
  frequency?: Pick<DemoFrequency, "id" | "name">;
  files?: SignalAttachment[];
};

export const demoUsers: DemoUser[] = [];
export const demoFrequencies: DemoFrequency[] = [];
export const demoSignals: DemoSignal[] = [];
export const demoTrail: string[] = [];

export function findSignal(id: string) {
  return demoSignals.find((signal) => signal.id === id);
}

export function findFrequency(id: string) {
  return demoFrequencies.find((frequency) => frequency.id === id);
}
