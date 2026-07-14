import { describe, expect, it } from "vitest";
import { parseOEmbedMetadata } from "./provider-metadata";

describe("parseOEmbedMetadata", () => {
  it("keeps only validated structured preview values", () => {
    expect(parseOEmbedMetadata({ title: "Night drive", author_name: "hela", thumbnail_url: "https://i.scdn.co/image/test", html: "<script>bad()</script>" })).toEqual({ title: "Night drive", creator: "hela", thumbnailUrl: "https://i.scdn.co/image/test" });
  });
  it("rejects invalid provider fields", () => {
    expect(parseOEmbedMetadata({ title: 42, thumbnail_url: "javascript:alert(1)" })).toBeNull();
  });
});
