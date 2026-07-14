export type PlayerItem = {
  signalId: string;
  provider: "youtube" | "spotify";
  entityType: string;
  externalId: string;
  canonicalUrl: string;
  providerUri?: string;
  title: string;
  creator?: string;
  thumbnailUrl?: string;
};

export type PlayerState = { current: PlayerItem | null; queue: PlayerItem[]; isOpen: boolean; isPlaying: boolean };
