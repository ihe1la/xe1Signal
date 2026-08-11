import { z } from "zod";

export const VIBE_ROOM_SLUG = "main";
export const VIBE_STATUSES = [
  "resolving",
  "downloading",
  "ready",
  "failed",
  "playing",
] as const;
export type VibeStatus = (typeof VIBE_STATUSES)[number];

export const vibeSourceSchema = z.string().trim().min(1).max(2048).url();
export const vibeQualitySchema = z.enum(["128", "192", "320", "original"]);
export const vibeControlSchema = z
  .object({
    action: z.enum(["play", "pause", "skip", "clear", "select"]),
    itemId: z.string().trim().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.action === "select" && !value.itemId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Select requires itemId", path: ["itemId"] });
    }
  });

const VIBE_SOURCE_HOSTS = [
  "youtube.com",
  "youtu.be",
  "spotify.com",
  "spotify.link",
  "soundcloud.com",
] as const;

function isHost(value: string, root: string) {
  return value === root || value.endsWith(`.${root}`);
}

export function assertVibeSourceUrl(value: string) {
  const parsed = vibeSourceSchema.parse(value);
  const url = new URL(parsed);
  const hostname = url.hostname.toLowerCase();
  if (
    (url.protocol !== "https:" && url.protocol !== "http:") ||
    !VIBE_SOURCE_HOSTS.some((root) => isHost(hostname, root))
  ) {
    throw new Error("Paste a YouTube, Spotify, or SoundCloud link");
  }
  url.username = "";
  url.password = "";
  return url.toString();
}

export function splitVibeArtists(value: string) {
  return value
    .split(",")
    .map((artist) => artist.trim())
    .filter(Boolean);
}

export function joinVibeArtists(artists: string[]) {
  return artists.map((artist) => artist.trim()).filter(Boolean).join(", ");
}

export function isVibePlayableStatus(status: string) {
  return status === "ready" || status === "playing";
}
