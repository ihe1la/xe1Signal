import { describe, expect, it } from "vitest";
import { createFinding } from "@/lib/findings";
import {
  buildFindingsMapGraph,
  extractFindingHost,
  findingTargetKey,
  parseFindingsMap,
  serializeFindingsMap,
} from "@/lib/findings-map";

describe("findings-map", () => {
  it("groups findings by host target", () => {
    const finding = createFinding("CORS on https://l30on.top/k/cors #destination")!;
    expect(extractFindingHost(finding)).toBe("l30on.top");
    expect(findingTargetKey(finding)).toBe("l30on.top");
  });

  it("builds a rooted target tree from notes", () => {
    const notes = [
      createFinding("Profile hub https://linktr.ee/ihe1la #profile")!,
      createFinding("Destination https://l30on.top/k/cors #cors")!,
      createFinding("orphan note without url #recon")!,
    ];
    const { nodes, edges } = buildFindingsMapGraph(notes);
    expect(nodes.some((node) => node.id === "root")).toBe(true);
    expect(nodes.some((node) => node.id === "target:linktr.ee")).toBe(true);
    expect(nodes.some((node) => node.id === "target:l30on.top")).toBe(true);
    expect(nodes.some((node) => node.id.startsWith("note:"))).toBe(true);
    expect(edges.length).toBeGreaterThan(notes.length);
  });

  it("round-trips saved positions", () => {
    const document = parseFindingsMap(serializeFindingsMap({
      positions: { root: { x: 10, y: 20 } },
      updatedAt: "2026-08-11T12:00:00.000Z",
    }));
    expect(document.positions.root).toEqual({ x: 10, y: 20 });
  });
});
