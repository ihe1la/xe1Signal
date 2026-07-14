import path from "node:path";

const youtubeHosts = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be"]);

export function normalizeYouTubeUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || !youtubeHosts.has(url.hostname.toLowerCase())) return null;

  let videoId = "";
  if (url.hostname.toLowerCase() === "youtu.be") videoId = url.pathname.split("/").filter(Boolean)[0] || "";
  else if (url.pathname === "/watch") videoId = url.searchParams.get("v") || "";
  else if (/^\/(shorts|live)\//.test(url.pathname)) videoId = url.pathname.split("/")[2] || "";

  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return null;
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function youtubeDownloadArgs(url: string, outputDirectory: string, maxBytes: number, maxDurationSeconds: number) {
  return [
    "--no-playlist",
    "--no-progress",
    "--no-warnings",
    "--max-filesize", String(maxBytes),
    "--match-filter", `duration <= ${maxDurationSeconds} & !is_live`,
    "--format", "bestaudio/best",
    "--extract-audio",
    "--audio-format", "mp3",
    "--audio-quality", "5",
    "--output", path.join(outputDirectory, "download.%(ext)s"),
    "--print", "after_move:filepath",
    url,
  ];
}
