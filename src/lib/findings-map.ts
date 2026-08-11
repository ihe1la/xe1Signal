import type { Edge, Node } from "@xyflow/react";

import { extractUrls, type Finding } from "@/lib/findings";

export const FINDINGS_MAP_STORAGE_KEY = "xe1signal-tools-findings-map-v2";

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
  host?: string | null;
  noteCount?: number;
  fresh?: boolean;
  [key: string]: unknown;
};

export type FindingsMapEdgeData = {
  kind: "spine" | "leaf";
  [key: string]: unknown;
};

const SKIP_TAGS = new Set(["recon", "threat", "header", "auth", "ihe1la"]);

const TARGET_GAP = 168;
const NOTE_GAP = 92;
const COL_ROOT = 48;
const COL_TARGET = 340;
const COL_NOTE = 680;

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
  if (line.length <= 64) return line;
  return `${line.slice(0, 61).trimEnd()}…`;
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

function defaultPosition(kind: FindingsMapNodeData["kind"], index: number, groupIndex = 0, groupSize = 1) {
  if (kind === "root") {
    const span = Math.max(groupSize - 1, 0) * TARGET_GAP;
    return { x: COL_ROOT, y: 40 + span / 2 };
  }
  if (kind === "target") return { x: COL_TARGET, y: 40 + groupIndex * TARGET_GAP };
  const targetY = 40 + groupIndex * TARGET_GAP;
  const stack = (index - (groupSize - 1) / 2) * NOTE_GAP;
  return { x: COL_NOTE, y: targetY + stack };
}

export function buildFindingsMapGraph(
  findings: Finding[],
  positions: FindingsMapPositions = {},
  options: { highlightFindingId?: string | null } = {},
): { nodes: Node<FindingsMapNodeData>[]; edges: Edge<FindingsMapEdgeData>[] } {
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
      position: positions[rootId] || defaultPosition("root", 0, 0, targets.length),
      data: {
        kind: "root",
        label: "Findings",
        detail: `${findings.length} note${findings.length === 1 ? "" : "s"} · ${targets.length} target${targets.length === 1 ? "" : "s"}`,
        noteCount: findings.length,
      },
      draggable: true,
    },
  ];
  const edges: Edge<FindingsMapEdgeData>[] = [];

  targets.forEach((target, groupIndex) => {
    const targetId = `target:${target}`;
    const items = groups.get(target) || [];
    const host = target.startsWith("#") || target === "unsorted" ? null : target;
    nodes.push({
      id: targetId,
      type: "findingsNode",
      position: positions[targetId] || defaultPosition("target", 0, groupIndex, items.length),
      data: {
        kind: "target",
        label: target,
        detail: `${items.length} note${items.length === 1 ? "" : "s"}`,
        host,
        noteCount: items.length,
      },
      draggable: true,
    });
    edges.push({
      id: `e:${rootId}->${targetId}`,
      source: rootId,
      target: targetId,
      type: "findingsEdge",
      data: { kind: "spine" },
      markerEnd: "url(#findings-edge-circle)",
    });

    items.forEach((finding, index) => {
      const noteId = `note:${finding.id}`;
      nodes.push({
        id: noteId,
        type: "findingsNode",
        position: positions[noteId] || defaultPosition("note", index, groupIndex, items.length),
        data: {
          kind: "note",
          label: findingLabel(finding),
          detail: finding.tags.slice(0, 3).map((tag) => `#${tag}`).join(" "),
          findingId: finding.id,
          tags: finding.tags,
          host: extractFindingHost(finding),
          fresh: options.highlightFindingId === finding.id,
        },
        draggable: true,
        className: options.highlightFindingId === finding.id ? "findings-node-fresh" : undefined,
      });
      edges.push({
        id: `e:${targetId}->${noteId}`,
        source: targetId,
        target: noteId,
        type: "findingsEdge",
        data: { kind: "leaf" },
        markerEnd: "url(#findings-edge-circle)",
        animated: options.highlightFindingId === finding.id,
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

export function mergePositions(
  saved: FindingsMapPositions,
  live: FindingsMapPositions,
): FindingsMapPositions {
  return { ...saved, ...live };
}
