import type { Edge, Node } from "@xyflow/react";

import { extractUrls, type Finding } from "@/lib/findings";

export const FINDINGS_MAP_STORAGE_KEY = "xe1signal-tools-findings-map-v1";

export type FindingsMapPositions = Record<string, { x: number; y: number }>;

export type FindingsMapDocument = {
  positions: FindingsMapPositions;
  updatedAt: string;
};

export type FindingsMapNodeData = {
  kind: "root" | "target" | "note";
  label: string;
  detail?: string;
  findingId?: string;
  tags?: string[];
  [key: string]: unknown;
};

const SKIP_TAGS = new Set(["recon", "threat", "header", "auth", "ihe1la"]);

export function extractFindingHost(finding: Finding) {
  for (const url of extractUrls(finding.body)) {
    try {
      const host = new URL(url).hostname.replace(/^www\./, "");
      if (host) return host;
    } catch {
      /* ignore bad urls */
    }
  }
  return null;
}

export function findingTargetKey(finding: Finding) {
  const host = extractFindingHost(finding);
  if (host) return host;
  const tag = finding.tags.find((item) => !SKIP_TAGS.has(item));
  if (tag) return `#${tag}`;
  return "unsorted";
}

export function findingLabel(finding: Finding) {
  const line = finding.body.replace(/\s+/g, " ").trim();
  if (line.length <= 72) return line;
  return `${line.slice(0, 69).trimEnd()}…`;
}

export function parseFindingsMap(raw: string | null): FindingsMapDocument {
  if (!raw) return { positions: {}, updatedAt: new Date().toISOString() };
  try {
    const parsed = JSON.parse(raw) as Partial<FindingsMapDocument>;
    const positions =
      parsed.positions && typeof parsed.positions === "object"
        ? Object.fromEntries(
            Object.entries(parsed.positions).filter(
              (entry): entry is [string, { x: number; y: number }] =>
                !!entry[1] && typeof entry[1].x === "number" && typeof entry[1].y === "number",
            ),
          )
        : {};
    return {
      positions,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return { positions: {}, updatedAt: new Date().toISOString() };
  }
}

export function serializeFindingsMap(document: FindingsMapDocument) {
  return JSON.stringify(document);
}

function defaultPosition(kind: FindingsMapNodeData["kind"], index: number, groupIndex = 0) {
  if (kind === "root") return { x: 40, y: 220 };
  if (kind === "target") return { x: 320, y: 40 + groupIndex * 140 };
  return { x: 620, y: 20 + groupIndex * 140 + index * 72 };
}

export function buildFindingsMapGraph(
  findings: Finding[],
  positions: FindingsMapPositions = {},
): { nodes: Node<FindingsMapNodeData>[]; edges: Edge[] } {
  const groups = new Map<string, Finding[]>();
  for (const finding of findings) {
    const key = findingTargetKey(finding);
    const bucket = groups.get(key) || [];
    bucket.push(finding);
    groups.set(key, bucket);
  }

  const targets = [...groups.keys()].sort((a, b) => {
    if (a === "unsorted") return 1;
    if (b === "unsorted") return -1;
    return a.localeCompare(b);
  });

  const rootId = "root";
  const nodes: Node<FindingsMapNodeData>[] = [
    {
      id: rootId,
      type: "findingsNode",
      position: positions[rootId] || defaultPosition("root", 0),
      data: {
        kind: "root",
        label: "Targets",
        detail: `${findings.length} note${findings.length === 1 ? "" : "s"} · ${targets.length} branch${targets.length === 1 ? "" : "es"}`,
      },
      draggable: true,
    },
  ];
  const edges: Edge[] = [];

  targets.forEach((target, groupIndex) => {
    const targetId = `target:${target}`;
    const items = groups.get(target) || [];
    nodes.push({
      id: targetId,
      type: "findingsNode",
      position: positions[targetId] || defaultPosition("target", 0, groupIndex),
      data: {
        kind: "target",
        label: target,
        detail: `${items.length} note${items.length === 1 ? "" : "s"}`,
      },
      draggable: true,
    });
    edges.push({
      id: `e:${rootId}->${targetId}`,
      source: rootId,
      target: targetId,
      type: "smoothstep",
      animated: false,
      style: { stroke: "rgba(167,139,250,.45)", strokeWidth: 1.5 },
    });

    items.forEach((finding, index) => {
      const noteId = `note:${finding.id}`;
      nodes.push({
        id: noteId,
        type: "findingsNode",
        position: positions[noteId] || defaultPosition("note", index, groupIndex),
        data: {
          kind: "note",
          label: findingLabel(finding),
          detail: finding.tags.slice(0, 3).map((tag) => `#${tag}`).join(" "),
          findingId: finding.id,
          tags: finding.tags,
        },
        draggable: true,
      });
      edges.push({
        id: `e:${targetId}->${noteId}`,
        source: targetId,
        target: noteId,
        type: "smoothstep",
        style: { stroke: "rgba(113,113,122,.55)", strokeWidth: 1.25 },
      });
    });
  });

  return { nodes, edges };
}

export function positionsFromNodes(nodes: Node[]) {
  const positions: FindingsMapPositions = {};
  for (const node of nodes) {
    positions[node.id] = { x: node.position.x, y: node.position.y };
  }
  return positions;
}
