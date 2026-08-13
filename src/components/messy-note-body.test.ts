import { describe, expect, it } from "vitest";
import { splitMessyNoteBody } from "@/components/messy-note-body";

describe("splitMessyNoteBody", () => {
  it("keeps normal prose as text", () => {
    expect(splitMessyNoteBody("saw X-Request-Id on api.target.com")).toEqual([
      { kind: "text", value: "saw X-Request-Id on api.target.com" },
    ]);
  });

  it("isolates bookmarklets and minified blobs into code blocks", () => {
    const bookmarklet = `javascript:(function(){${"x".repeat(200)}})();`;
    const blocks = splitMessyNoteBody(`js endpoint\n${bookmarklet}\n#recon`);
    expect(blocks[0]).toEqual({ kind: "text", value: "js endpoint\n" });
    expect(blocks[1]).toEqual({ kind: "code", value: bookmarklet });
    expect(blocks[2]).toEqual({ kind: "text", value: "\n#recon" });
  });

  it("keeps fenced markdown code blocks as one text unit even with long JWTs", () => {
    const jwt = `eyJ${"a".repeat(200)}.${"b".repeat(200)}.${"c".repeat(200)}`;
    const fenced = [
      "request dump",
      "```",
      "GET /api/v4/brands HTTP/2",
      "Host: app-api.example.com",
      `Authorization: Bearer ${jwt}`,
      "Accept: application/json",
      "```",
    ].join("\n");

    expect(splitMessyNoteBody(fenced)).toEqual([{ kind: "text", value: fenced }]);
  });
});
