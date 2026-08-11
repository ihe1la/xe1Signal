import { describe, expect, it } from "vitest";
import {
  createFinding,
  extractTags,
  parseFindings,
  searchFindings,
  serializeFindings,
  updateFinding,
} from "@/lib/findings";

describe("findings", () => {
  it("extracts hashtags from messy notes", () => {
    expect(extractTags("saw X-Request-Id on api.target.com #header #target.com")).toEqual(["header", "target.com"]);
  });

  it("creates and updates findings", () => {
    const created = createFinding("  new header #auth  ");
    expect(created?.body).toBe("new header #auth");
    expect(created?.tags).toEqual(["auth"]);

    const updated = updateFinding(created!, "renamed #idor");
    expect(updated.body).toBe("renamed #idor");
    expect(updated.tags).toEqual(["idor"]);
  });

  it("searches body and tags", () => {
    const items = [
      createFinding("saw X-Request-Id #header")!,
      createFinding("possible idor on /users #idor")!,
    ];
    expect(searchFindings(items, "request-id")).toHaveLength(1);
    expect(searchFindings(items, "#idor")).toHaveLength(1);
    expect(searchFindings(items, "users idor")).toHaveLength(1);
  });

  it("round-trips storage", () => {
    const items = [createFinding("note #a")!];
    expect(parseFindings(serializeFindings(items))).toEqual(items);
    expect(parseFindings("{")).toEqual([]);
  });
});
