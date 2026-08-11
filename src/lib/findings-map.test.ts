import { describe, expect, it } from "vitest";
import { createFinding, createLinktreeSeedFindings } from "@/lib/findings";
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

  it("builds a rooted target tree from Linktree seeds", () => {
    const seeds = createLinktreeSeedFindings();
    const { nodes, edges } = buildFindingsMapGraph(seeds);
    expect(nodes.some((node) => node.id === "root")).toBe(true);
    expect(nodes.some((node) => node.id === "target:linktr.ee")).toBe(true);
    expect(nodes.some((node) => node.id.startsWith("note:"))).toBe(true);
    expect(edges.length).toBeGreaterThan(seeds.length);
  });

  it("round-trips saved positions", () => {
    const document = parseFindingsMap(serializeFindingsMap({
      positions: { root: { x: 10, y: 20 } },
      updatedAt: "2026-08-11T12:00:00.000Z",
    }));
    expect(document.positions.root).toEqual({ x: 10, y: 20 });
  });
});
