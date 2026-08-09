import { describe, expect, it } from "vitest";

import { assertPartySourceUrl, isPartyPlayableStatus, joinPartyArtists, splitPartyArtists } from "@/lib/party";

describe("party source validation", () => {
  it("accepts the supported provider hosts and strips credentials", () => {
    expect(assertPartySourceUrl("https://user:pass@www.youtube.com/watch?v=abc")).toBe("https://www.youtube.com/watch?v=abc");
    expect(assertPartySourceUrl("https://open.spotify.com/track/abc")).toBe("https://open.spotify.com/track/abc");
    expect(assertPartySourceUrl("https://soundcloud.com/artist/track")).toBe("https://soundcloud.com/artist/track");
  });

  it("rejects non-provider hosts", () => {
    expect(() => assertPartySourceUrl("https://example.com/song")).toThrow(/YouTube, Spotify, or SoundCloud/);
    expect(() => assertPartySourceUrl("https://youtube.com.evil.example/watch?v=abc")).toThrow();
  });
});

describe("party metadata helpers", () => {
  it("round-trips the stored artist representation", () => {
    expect(splitPartyArtists(joinPartyArtists(["Billie Eilish", "Finneas"]))).toEqual(["Billie Eilish", "Finneas"]);
  });

  it("recognizes only playable queue states", () => {
    expect(isPartyPlayableStatus("ready")).toBe(true);
    expect(isPartyPlayableStatus("playing")).toBe(true);
    expect(isPartyPlayableStatus("downloading")).toBe(false);
  });
});
