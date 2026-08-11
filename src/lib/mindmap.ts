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

export const MINDMAP_STORAGE_KEY = "xe1signal-tools-mindmap";

const BRANCH_COLORS = ["#8f7be9", "#5b9fd4", "#5fbf9a", "#d4a15b", "#d46b8f", "#7bb0bf"] as const;

export function createNodeId() {
  return `n_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

export function createDefaultMindMap(): MindMapDocument {
  const rootId = "root";
  const reconId = createNodeId();
  const studyId = createNodeId();
  const notesId = createNodeId();

  return {
    title: "Targets",
    updatedAt: new Date().toISOString(),
    nodes: [
      { id: rootId, parentId: null, text: "Targets", note: "Central topic for this sheet", x: 380, y: 275 },
      { id: reconId, parentId: rootId, kind: "branch", text: "Recon", note: "Map routes, hosts, tech, and entry points.", x: 44, y: 118 },
      { id: studyId, parentId: rootId, kind: "branch", text: "Authentication", note: "Sessions, roles, recovery, and trust boundaries.", x: 718, y: 118 },
      { id: notesId, parentId: rootId, kind: "branch", text: "Inputs", note: "Query, body, headers, files, and client state.", x: 700, y: 430 },
      { id: createNodeId(), parentId: rootId, kind: "branch", text: "Impact", note: "Data access, actions, and realistic consequences.", x: 44, y: 440 },
      { id: createNodeId(), parentId: rootId, kind: "callout", text: "Threat model", note: "What can an attacker control, and what changes after the request?", x: 235, y: 62 },
      { id: createNodeId(), parentId: rootId, kind: "callout", text: "Next proof", note: "Capture the smallest request, response, and browser evidence.", x: 385, y: 585 },
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

export function nextChildPosition(nodes: MindNode[], parentId: string) {
  const parent = nodes.find((node) => node.id === parentId);
  const siblings = getChildren(nodes, parentId);
  if (!parent) return { x: 80, y: 80 };

  const index = siblings.length;
  const side = index % 2 === 0 ? -1 : 1;
  const tier = Math.floor(index / 2);
  return {
    x: parent.x + side * 280,
    y: parent.y + (tier - 0.5) * 110,
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
    x: Math.max(24, position.x),
    y: Math.max(24, position.y),
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
