export type MindNode = {
  id: string;
  parentId: string | null;
  kind?: "branch" | "callout";
  text: string;
  note: string;
  x: number;
  y: number;
};

export type MindMapDocument = {
  title: string;
  nodes: MindNode[];
  updatedAt: string;
};

export const MINDMAP_STORAGE_KEY = "xe1signal-tools-mindmap-v3";

const BRANCH_COLORS = ["#8b6cff", "#a78bfa", "#7c6bd6", "#9580e8", "#6d5bb8", "#b8a4ff"] as const;

export const NODE_WIDTH = 168;
export const NODE_HEIGHT = 52;
const CHILD_GAP_Y = 64;
const CHILD_GAP_X = 220;

export function createNodeId() {
  return `n_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

/** Clean left/right Linktree sample — connectors never cross node bodies. */
export function createDefaultMindMap(): MindMapDocument {
  return {
    title: "ihe1la Linktree",
    updatedAt: new Date().toISOString(),
    nodes: [
      {
        id: "root",
        parentId: null,
        text: "ihe1la",
        note: "# linktr.ee/ihe1la\n\nSample from https://linktr.ee/ihe1la\n\n- Bio: it3xe1l",
        x: 516,
        y: 268,
      },
      {
        id: "social",
        parentId: "root",
        kind: "branch",
        text: "Social",
        note: "Header social icons on the Linktree profile.",
        x: 280,
        y: 188,
      },
      {
        id: "destinations",
        parentId: "root",
        kind: "branch",
        text: "Destinations",
        note: "Classic link buttons on the page.",
        x: 752,
        y: 148,
      },
      {
        id: "bookings",
        parentId: "root",
        kind: "branch",
        text: "Bookings",
        note: "Coaching / session CTA.",
        x: 752,
        y: 388,
      },
      {
        id: "threat",
        parentId: "root",
        kind: "callout",
        text: "Threat notes",
        note: "What can a visitor control from this Linktree?\n\n- Outbound redirects\n- Social embeds\n- Booking deep-links",
        x: 280,
        y: 388,
      },
      {
        id: "ig",
        parentId: "social",
        kind: "branch",
        text: "Instagram",
        note: "- Icon: https://instagram.com/it3hela\n- Block: https://www.instagram.com/selfdesuv",
        x: 44,
        y: 108,
      },
      {
        id: "threads",
        parentId: "social",
        kind: "branch",
        text: "Threads",
        note: "https://www.threads.com/it3helt",
        x: 44,
        y: 188,
      },
      {
        id: "youtube",
        parentId: "social",
        kind: "branch",
        text: "YouTube",
        note: "https://www.youtube.com/channel/UCXh5H8tGa4TsaNAWgik4ihQ",
        x: 44,
        y: 268,
      },
      {
        id: "l30on",
        parentId: "destinations",
        kind: "branch",
        text: "l30on.top",
        note: "https://l30on.top/k/cors",
        x: 988,
        y: 28,
      },
      {
        id: "ato",
        parentId: "destinations",
        kind: "branch",
        text: "ATO PROOF LINK",
        note: "https://example.com/ul-001-ato",
        x: 988,
        y: 108,
      },
      {
        id: "bbclassic",
        parentId: "destinations",
        kind: "branch",
        text: "bbclassic",
        note: "https://example.com/bbclassic",
        x: 988,
        y: 188,
      },
      {
        id: "pinterest",
        parentId: "destinations",
        kind: "branch",
        text: "Pinterest",
        note: "https://de.pinterest.com/helmelme",
        x: 988,
        y: 268,
      },
      {
        id: "session",
        parentId: "bookings",
        kind: "callout",
        text: "Book a session",
        note: "Coaching CTA — “Book a session with me”.",
        x: 988,
        y: 388,
      },
    ],
  };
}

export function parseMindMap(raw: string | null): MindMapDocument | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<MindMapDocument>;
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.nodes)) return null;
    const nodes = parsed.nodes.filter(
      (node): node is MindNode =>
        !!node &&
        typeof node.id === "string" &&
        (node.parentId === null || typeof node.parentId === "string") &&
        typeof node.text === "string" &&
        typeof node.note === "string" &&
        typeof node.x === "number" &&
        typeof node.y === "number",
    );
    if (!nodes.some((node) => node.parentId === null)) return null;
    return {
      title: typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.trim() : "Targets",
      nodes,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function serializeMindMap(document: MindMapDocument) {
  return JSON.stringify(document);
}

export function getRootNode(nodes: MindNode[]) {
  return nodes.find((node) => node.parentId === null) ?? nodes[0] ?? null;
}

export function getChildren(nodes: MindNode[], parentId: string) {
  return nodes.filter((node) => node.parentId === parentId);
}

export function branchColor(nodes: MindNode[], nodeId: string) {
  const root = getRootNode(nodes);
  if (!root) return BRANCH_COLORS[0];
  if (nodeId === root.id) return BRANCH_COLORS[0];

  let current = nodes.find((node) => node.id === nodeId);
  while (current?.parentId && current.parentId !== root.id) {
    current = nodes.find((node) => node.id === current?.parentId);
  }
  const topLevel = getChildren(nodes, root.id);
  const index = Math.max(0, topLevel.findIndex((node) => node.id === (current?.id ?? nodeId)));
  return BRANCH_COLORS[index % BRANCH_COLORS.length];
}

/** Stack children left or right of parent (XMind side branches). */
export function nextChildPosition(nodes: MindNode[], parentId: string) {
  const parent = nodes.find((node) => node.id === parentId);
  const siblings = getChildren(nodes, parentId);
  if (!parent) return { x: 80, y: 80 };

  const root = getRootNode(nodes);
  const preferLeft = root ? parent.x + NODE_WIDTH / 2 <= root.x + NODE_WIDTH / 2 : false;
  const side = preferLeft ? -1 : 1;
  const index = siblings.length;
  const columnX = parent.x + side * CHILD_GAP_X;
  const startY = parent.y - ((Math.max(siblings.length, 1) - 1) * CHILD_GAP_Y) / 2;

  return {
    x: Math.max(24, columnX),
    y: Math.max(24, startY + index * CHILD_GAP_Y),
  };
}

export function addChildNode(document: MindMapDocument, parentId: string, text = "New target", kind: MindNode["kind"] = "branch"): MindMapDocument {
  const parent = document.nodes.find((node) => node.id === parentId);
  if (!parent) return document;
  const position = nextChildPosition(document.nodes, parentId);
  const node: MindNode = {
    id: createNodeId(),
    parentId,
    kind,
    text,
    note: "",
    x: position.x,
    y: position.y,
  };
  return {
    ...document,
    updatedAt: new Date().toISOString(),
    nodes: [...document.nodes, node],
  };
}

export function updateNode(
  document: MindMapDocument,
  nodeId: string,
  patch: Partial<Pick<MindNode, "text" | "note" | "x" | "y">>,
): MindMapDocument {
  return {
    ...document,
    updatedAt: new Date().toISOString(),
    nodes: document.nodes.map((node) => (node.id === nodeId ? { ...node, ...patch } : node)),
  };
}

export function deleteNode(document: MindMapDocument, nodeId: string): MindMapDocument {
  const root = getRootNode(document.nodes);
  if (!root || root.id === nodeId) return document;

  const remove = new Set<string>();
  const visit = (id: string) => {
    remove.add(id);
    for (const child of getChildren(document.nodes, id)) visit(child.id);
  };
  visit(nodeId);

  return {
    ...document,
    updatedAt: new Date().toISOString(),
    nodes: document.nodes.filter((node) => !remove.has(node.id)),
  };
}

/** Horizontal side-to-side cubic — exits parent edge, enters child edge, never through boxes. */
export function nodeAnchor(from: MindNode, to: MindNode, width = NODE_WIDTH, height = NODE_HEIGHT) {
  const fromCx = from.x + width / 2;
  const toCx = to.x + width / 2;
  const childOnLeft = toCx < fromCx;

  const x1 = childOnLeft ? from.x : from.x + width;
  const y1 = from.y + height / 2;
  const x2 = childOnLeft ? to.x + width : to.x;
  const y2 = to.y + height / 2;
  const midX = (x1 + x2) / 2;

  return { x1, y1, x2, y2, c1x: midX, c1y: y1, c2x: midX, c2y: y2 };
}
