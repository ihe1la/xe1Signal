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

/** Bumped so existing local maps pick up the Linktree sample + layout. */
export const MINDMAP_STORAGE_KEY = "xe1signal-tools-mindmap-v2";

/** Theme-aligned violet ladder (matches --primary 263 70% 50%). */
const BRANCH_COLORS = ["#8b6cff", "#a78bfa", "#7c6bd6", "#9580e8", "#6d5bb8", "#b8a4ff"] as const;

const NODE_WIDTH = 200;
const NODE_HEIGHT = 72;

export function createNodeId() {
  return `n_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

/** Sample map from https://linktr.ee/ihe1la — radially spaced so connectors do not cross. */
export function createDefaultMindMap(): MindMapDocument {
  const rootId = "root";
  const socialId = "social";
  const destinationsId = "destinations";
  const bookingsId = "bookings";

  const cx = 700;
  const cy = 460;

  return {
    title: "ihe1la Linktree",
    updatedAt: new Date().toISOString(),
    nodes: [
      {
        id: rootId,
        parentId: null,
        text: "ihe1la",
        note: "# linktr.ee/ihe1la\n\nSample target sheet from the public Linktree profile.\n\n- Profile: https://linktr.ee/ihe1la\n- Bio: it3xe1l",
        x: cx - NODE_WIDTH / 2,
        y: cy - NODE_HEIGHT / 2,
      },
      {
        id: socialId,
        parentId: rootId,
        kind: "branch",
        text: "Social",
        note: "Header social icons on the Linktree profile.",
        x: 180,
        y: 200,
      },
      {
        id: destinationsId,
        parentId: rootId,
        kind: "branch",
        text: "Destinations",
        note: "Classic link buttons on the page.",
        x: 1080,
        y: 180,
      },
      {
        id: bookingsId,
        parentId: rootId,
        kind: "branch",
        text: "Bookings",
        note: "Coaching / session CTA.",
        x: 1080,
        y: 620,
      },
      {
        id: "ig",
        parentId: socialId,
        kind: "branch",
        text: "Instagram",
        note: "- Profile icon: https://instagram.com/it3hela\n- Linked block: https://www.instagram.com/selfdesuv",
        x: 40,
        y: 80,
      },
      {
        id: "threads",
        parentId: socialId,
        kind: "branch",
        text: "Threads",
        note: "https://www.threads.com/it3helt",
        x: 40,
        y: 220,
      },
      {
        id: "youtube",
        parentId: socialId,
        kind: "branch",
        text: "YouTube",
        note: "https://www.youtube.com/channel/UCXh5H8tGa4TsaNAWgik4ihQ",
        x: 40,
        y: 360,
      },
      {
        id: "l30on",
        parentId: destinationsId,
        kind: "branch",
        text: "l30on.top",
        note: "https://l30on.top/k/cors\n\nAlso listed as Linktree significantLink.",
        x: 1320,
        y: 40,
      },
      {
        id: "ato",
        parentId: destinationsId,
        kind: "branch",
        text: "ATO PROOF LINK",
        note: "https://example.com/ul-001-ato",
        x: 1320,
        y: 180,
      },
      {
        id: "bbclassic",
        parentId: destinationsId,
        kind: "branch",
        text: "bbclassic",
        note: "https://example.com/bbclassic",
        x: 1320,
        y: 320,
      },
      {
        id: "pinterest",
        parentId: destinationsId,
        kind: "branch",
        text: "Pinterest",
        note: "https://de.pinterest.com/helmelme",
        x: 1320,
        y: 460,
      },
      {
        id: "session",
        parentId: bookingsId,
        kind: "callout",
        text: "Book a session",
        note: "Coaching CTA on Linktree — “Book a session with me”.",
        x: 1320,
        y: 640,
      },
      {
        id: "threat",
        parentId: rootId,
        kind: "callout",
        text: "Threat notes",
        note: "What can a visitor control from this Linktree?\n\n- Outbound redirects\n- OAuth / social embeds\n- Booking deep-links",
        x: 180,
        y: 640,
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

/** Place new children in a radial fan so connectors stay separated. */
export function nextChildPosition(nodes: MindNode[], parentId: string) {
  const parent = nodes.find((node) => node.id === parentId);
  const siblings = getChildren(nodes, parentId);
  if (!parent) return { x: 80, y: 80 };

  const count = siblings.length;
  const radius = 280 + Math.floor(count / 6) * 40;
  const start = -Math.PI * 0.75;
  const sweep = Math.PI * 1.5;
  const angle = start + (sweep * (count + 0.5)) / Math.max(count + 1, 4);
  return {
    x: Math.max(24, parent.x + NODE_WIDTH / 2 + Math.cos(angle) * radius - NODE_WIDTH / 2),
    y: Math.max(24, parent.y + NODE_HEIGHT / 2 + Math.sin(angle) * radius - NODE_HEIGHT / 2),
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

export function nodeAnchor(from: MindNode, to: MindNode, width = NODE_WIDTH, height = NODE_HEIGHT) {
  const fromCx = from.x + width / 2;
  const fromCy = from.y + height / 2;
  const toCx = to.x + width / 2;
  const toCy = to.y + height / 2;
  const dx = toCx - fromCx;
  const dy = toCy - fromCy;

  let x1 = fromCx;
  let y1 = fromCy;
  let x2 = toCx;
  let y2 = toCy;

  if (Math.abs(dx) >= Math.abs(dy)) {
    x1 = dx >= 0 ? from.x + width : from.x;
    y1 = fromCy;
    x2 = dx >= 0 ? to.x : to.x + width;
    y2 = toCy;
  } else {
    x1 = fromCx;
    y1 = dy >= 0 ? from.y + height : from.y;
    x2 = toCx;
    y2 = dy >= 0 ? to.y : to.y + height;
  }

  const mid = Math.max(48, Math.abs(x2 - x1) * 0.45);
  const c1x = Math.abs(dx) >= Math.abs(dy) ? x1 + Math.sign(dx || 1) * mid : x1;
  const c1y = Math.abs(dx) >= Math.abs(dy) ? y1 : y1 + Math.sign(dy || 1) * mid;
  const c2x = Math.abs(dx) >= Math.abs(dy) ? x2 - Math.sign(dx || 1) * mid : x2;
  const c2y = Math.abs(dx) >= Math.abs(dy) ? y2 : y2 - Math.sign(dy || 1) * mid;

  return { x1, y1, x2, y2, c1x, c1y, c2x, c2y };
}
