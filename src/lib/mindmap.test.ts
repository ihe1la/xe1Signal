import { describe, expect, it } from "vitest";
import {
  addChildNode,
  createDefaultMindMap,
  deleteNode,
  getRootNode,
  parseMindMap,
  serializeMindMap,
  updateNode,
} from "@/lib/mindmap";

describe("mindmap", () => {
  it("creates a rooted Linktree sample sheet", () => {
    const document = createDefaultMindMap();
    const root = getRootNode(document.nodes);
    expect(root?.text).toBe("ihe1la");
    expect(document.title).toBe("ihe1la Linktree");
    expect(document.nodes.some((node) => node.text === "l30on.top")).toBe(true);
    expect(document.nodes.length).toBeGreaterThan(5);
  });

  it("round-trips through serialize/parse", () => {
    const document = createDefaultMindMap();
    const restored = parseMindMap(serializeMindMap(document));
    expect(restored?.title).toBe(document.title);
    expect(restored?.nodes).toHaveLength(document.nodes.length);
  });

  it("adds and removes child branches without deleting the root", () => {
    const base = createDefaultMindMap();
    const root = getRootNode(base.nodes)!;
    const withChild = addChildNode(base, root.id, "New branch");
    const child = withChild.nodes.find((node) => node.text === "New branch");
    expect(child?.parentId).toBe(root.id);

    const pruned = deleteNode(withChild, child!.id);
    expect(pruned.nodes.some((node) => node.id === child!.id)).toBe(false);
    expect(getRootNode(pruned.nodes)?.id).toBe(root.id);

    expect(deleteNode(pruned, root.id).nodes).toEqual(pruned.nodes);
  });

  it("updates node text and note", () => {
    const document = createDefaultMindMap();
    const root = getRootNode(document.nodes)!;
    const next = updateNode(document, root.id, { text: "Mission", note: "Primary map" });
    expect(next.nodes.find((node) => node.id === root.id)).toMatchObject({ text: "Mission", note: "Primary map" });
  });

  it("rejects invalid stored payloads", () => {
    expect(parseMindMap("{")).toBeNull();
    expect(parseMindMap(JSON.stringify({ nodes: [] }))).toBeNull();
  });
});
