import { describe, expect, it } from "vitest";

import { assertVibeSourceUrl, isVibePlayableStatus, joinVibeArtists, splitVibeArtists, vibeControlSchema } from "@/lib/vibe";

describe("vibe source validation", () => {
  it("accepts the supported provider hosts and strips credentials", () => {
    expect(assertVibeSourceUrl("https://user:pass@www.youtube.com/watch?v=abc")).toBe("https://www.youtube.com/watch?v=abc");
    expect(assertVibeSourceUrl("https://open.spotify.com/track/abc")).toBe("https://open.spotify.com/track/abc");
    expect(assertVibeSourceUrl("https://soundcloud.com/artist/track")).toBe("https://soundcloud.com/artist/track");
  });

  it("rejects non-provider hosts", () => {
    expect(() => assertVibeSourceUrl("https://example.com/song")).toThrow(/YouTube, Spotify, or SoundCloud/);
    expect(() => assertVibeSourceUrl("https://youtube.com.evil.example/watch?v=abc")).toThrow();
  });
});

describe("vibe metadata helpers", () => {
  it("round-trips the stored artist representation", () => {
    expect(splitVibeArtists(joinVibeArtists(["Billie Eilish", "Finneas"]))).toEqual(["Billie Eilish", "Finneas"]);
  });

  it("recognizes only playable queue states", () => {
    expect(isVibePlayableStatus("ready")).toBe(true);
    expect(isVibePlayableStatus("playing")).toBe(true);
    expect(isVibePlayableStatus("downloading")).toBe(false);
  });
});

describe("vibe control schema", () => {
  it("requires itemId when selecting a queue track", () => {
    expect(vibeControlSchema.safeParse({ action: "select" }).success).toBe(false);
    expect(vibeControlSchema.safeParse({ action: "select", itemId: "track-1" }).success).toBe(true);
  });
});
