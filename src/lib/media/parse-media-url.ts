export type ParsedMedia =
  | { provider: "youtube"; entityType: "video"; externalId: string; canonicalUrl: string }
  | { provider: "spotify"; entityType: "track" | "album" | "playlist" | "artist" | "show" | "episode"; externalId: string; canonicalUrl: string; spotifyUri: string };

const youtubeHosts = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be"]);
const spotifyTypes = new Set(["track", "album", "playlist", "artist", "show", "episode"]);

export function isSpotifyShortLink(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && url.hostname.toLowerCase() === "spotify.link" && url.pathname.length > 1;
  } catch { return false; }
}

export function isAllowedMediaThumbnail(value: string, provider: "youtube" | "spotify") {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return false;
    const host = url.hostname.toLowerCase();
    return provider === "youtube" ? host === "i.ytimg.com" || host === "img.youtube.com" : host === "i.scdn.co" || host.endsWith(".scdn.co") || host.endsWith(".spotifycdn.com");
  } catch { return false; }
}

export function parseMediaUrl(value: string): ParsedMedia | null {
  let url: URL;
  try { url = new URL(value.trim()); } catch { return null; }
  if (url.protocol !== "https:" || url.username || url.password) return null;
  url.hash = "";
  const host = url.hostname.toLowerCase();

  if (youtubeHosts.has(host)) {
    let id = "";
    if (host === "youtu.be") {
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts.length !== 1) return null;
      id = parts[0];
    } else if (url.pathname === "/watch") id = url.searchParams.get("v") || "";
    else {
      const match = url.pathname.match(/^\/(shorts|live|embed)\/([A-Za-z0-9_-]{11})\/?$/);
      if (match) id = match[2];
    }
    if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
    return { provider: "youtube", entityType: "video", externalId: id, canonicalUrl: `https://www.youtube.com/watch?v=${id}` };
  }

  if (host === "open.spotify.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0]?.startsWith("intl-")) parts.shift();
    if (parts.length !== 2 || !spotifyTypes.has(parts[0]) || !/^[A-Za-z0-9]{10,64}$/.test(parts[1])) return null;
    const entityType = parts[0] as Extract<ParsedMedia, { provider: "spotify" }>['entityType'];
    const externalId = parts[1];
    return { provider: "spotify", entityType, externalId, canonicalUrl: `https://open.spotify.com/${entityType}/${externalId}`, spotifyUri: `spotify:${entityType}:${externalId}` };
  }

  return null;
}
