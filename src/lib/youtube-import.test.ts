import { describe, expect, it } from "vitest";
import { normalizeYouTubeUrl, youtubeDownloadArgs } from "./youtube-import";

describe("normalizeYouTubeUrl", () => {
  it("accepts supported single-video URLs and removes playlist parameters", () => {
    expect(normalizeYouTubeUrl("https://youtu.be/dQw4w9WgXcQ?si=test")).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(normalizeYouTubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL123")).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(normalizeYouTubeUrl("https://youtube.com/shorts/dQw4w9WgXcQ")).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  });

  it("rejects non-YouTube, insecure, playlist-only, and malformed URLs", () => {
    expect(normalizeYouTubeUrl("https://example.com/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(normalizeYouTubeUrl("http://youtube.com/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(normalizeYouTubeUrl("https://youtube.com/playlist?list=PL123")).toBeNull();
    expect(normalizeYouTubeUrl("not a url")).toBeNull();
  });
});

describe("youtubeDownloadArgs", () => {
  it("disables playlists and applies media limits without shell interpolation", () => {
    const args = youtubeDownloadArgs("https://www.youtube.com/watch?v=dQw4w9WgXcQ", "/tmp/job", 10_000, 600);
    expect(args).toContain("--no-playlist");
    expect(args).toContain("duration <= 600 & !is_live");
    expect(args.at(-1)).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  });
});
