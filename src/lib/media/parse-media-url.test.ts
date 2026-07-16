import { describe, expect, it } from "vitest";
import {
  isAllowedMediaThumbnail,
  isSpotifyShortLink,
  mediaIdentityMatches,
  parseMediaUrl,
} from "./parse-media-url";

const youtubeId = "dQw4w9WgXcQ";
describe("parseMediaUrl", () => {
  it.each([
    `https://youtube.com/watch?v=${youtubeId}&utm_source=x`,
    `https://www.youtube.com/watch?v=${youtubeId}`,
    `https://m.youtube.com/watch?v=${youtubeId}`,
    `https://music.youtube.com/watch?v=${youtubeId}`,
    `https://youtu.be/${youtubeId}`,
    `https://youtube.com/shorts/${youtubeId}`,
    `https://youtube.com/live/${youtubeId}`,
    `https://youtube.com/embed/${youtubeId}`,
    `https://youtube.com/watch?v=${youtubeId}#fragment`,
  ])("normalizes YouTube URL %s", (value) =>
    expect(parseMediaUrl(value)).toMatchObject({
      provider: "youtube",
      externalId: youtubeId,
      canonicalUrl: `https://www.youtube.com/watch?v=${youtubeId}`,
    }),
  );

  it.each(["track", "album", "playlist", "artist", "show", "episode"])(
    "normalizes Spotify %s URLs",
    (type) => {
      expect(
        parseMediaUrl(
          `https://open.spotify.com/${type}/4uLU6hMCjMI75M1A2tKUQC?si=tracking`,
        ),
      ).toMatchObject({
        provider: "spotify",
        entityType: type,
        externalId: "4uLU6hMCjMI75M1A2tKUQC",
      });
    },
  );

  it("normalizes Audius track URLs", () => {
    const media = parseMediaUrl(
      "https://www.audius.co/cromaluce/the-night?utm_source=share",
    );
    expect(media).toMatchObject({
      provider: "audius",
      entityType: "track",
      canonicalUrl: "https://audius.co/cromaluce/the-night",
    });
    expect(mediaIdentityMatches(media, "audius", "track", "2ANlJpp")).toBe(
      true,
    );
  });

  it.each([
    "http://youtube.com/watch?v=dQw4w9WgXcQ",
    "https://evil.test/watch?v=dQw4w9WgXcQ",
    "https://user:pass@youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com/playlist?list=x",
    "https://youtube.com/watch?v=short",
    "https://open.spotify.com/concert/4uLU6hMCjMI75M1A2tKUQC",
    "not a url",
  ])("rejects invalid input %s", (value) =>
    expect(parseMediaUrl(value)).toBeNull(),
  );

  it("validates only HTTPS spotify.link short links", () => {
    expect(isSpotifyShortLink("https://spotify.link/abc123")).toBe(true);
    expect(isSpotifyShortLink("http://spotify.link/abc123")).toBe(false);
    expect(isSpotifyShortLink("https://spotify.link.evil.test/abc123")).toBe(
      false,
    );
  });
  it("allowlists provider thumbnail hosts", () => {
    expect(
      isAllowedMediaThumbnail(
        "https://i.ytimg.com/vi/id/hqdefault.jpg",
        "youtube",
      ),
    ).toBe(true);
    expect(
      isAllowedMediaThumbnail("https://i.scdn.co/image/id", "spotify"),
    ).toBe(true);
    expect(
      isAllowedMediaThumbnail(
        "https://val005.open-audio-validator.com/content/id/480x480.jpg",
        "audius",
      ),
    ).toBe(true);
    expect(
      isAllowedMediaThumbnail("https://internal.test/image", "spotify"),
    ).toBe(false);
  });
});
