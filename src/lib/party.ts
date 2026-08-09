import { z } from "zod";

export const PARTY_ROOM_SLUG = "main";
export const PARTY_STATUSES = [
  "resolving",
  "downloading",
  "ready",
  "failed",
  "playing",
] as const;
export type PartyStatus = (typeof PARTY_STATUSES)[number];

export const partySourceSchema = z.string().trim().min(1).max(2048).url();
export const partyQualitySchema = z.enum(["128", "192", "320", "original"]);
export const partyControlSchema = z.object({
  action: z.enum(["play", "pause", "skip", "clear"]),
  itemId: z.string().trim().min(1).optional(),
});

const PARTY_SOURCE_HOSTS = [
  "youtube.com",
  "youtu.be",
  "spotify.com",
  "spotify.link",
  "soundcloud.com",
] as const;

function isHost(value: string, root: string) {
  return value === root || value.endsWith(`.${root}`);
}

export function assertPartySourceUrl(value: string) {
  const parsed = partySourceSchema.parse(value);
  const url = new URL(parsed);
  const hostname = url.hostname.toLowerCase();
  if (
    (url.protocol !== "https:" && url.protocol !== "http:") ||
    !PARTY_SOURCE_HOSTS.some((root) => isHost(hostname, root))
  ) {
    throw new Error("Paste a YouTube, Spotify, or SoundCloud link");
  }
  url.username = "";
  url.password = "";
  return url.toString();
}

export function splitPartyArtists(value: string) {
  return value
    .split(",")
    .map((artist) => artist.trim())
    .filter(Boolean);
}

export function joinPartyArtists(artists: string[]) {
  return artists.map((artist) => artist.trim()).filter(Boolean).join(", ");
}

export function isPartyPlayableStatus(status: string) {
  return status === "ready" || status === "playing";
}
