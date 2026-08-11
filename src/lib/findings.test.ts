import { describe, expect, it } from "vitest";
import {
  collectFindingTags,
  createFinding,
  createLinktreeSeedFindings,
  extractTags,
  extractUrls,
  mergeSeedFindings,
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

  it("seeds Linktree sample findings", () => {
    const seeds = createLinktreeSeedFindings();
    expect(seeds.length).toBeGreaterThan(5);
    expect(seeds.some((item) => item.body.includes("linktr.ee/ihe1la"))).toBe(true);
    expect(seeds.some((item) => item.body.includes("l30on.top"))).toBe(true);
    expect(collectFindingTags(seeds).some((item) => item.tag === "linktree")).toBe(true);
    expect(extractUrls(seeds[0].body)[0]).toContain("https://");
  });

  it("merges seeds without duplicating ids", () => {
    const seeds = createLinktreeSeedFindings();
    const once = mergeSeedFindings([], seeds);
    const twice = mergeSeedFindings(once, seeds);
    expect(twice).toHaveLength(once.length);
  });
});
