"use client";

import * as React from "react";
import { Rnd } from "react-rnd";
import { FileText, GitBranchPlus, Minus, Plus, RotateCcw, Trash2 } from "lucide-react";
import {
  MINDMAP_STORAGE_KEY,
  NODE_HEIGHT,
  NODE_WIDTH,
  addChildNode,
  branchColor,
  createDefaultMindMap,
  deleteNode,
  getRootNode,
  nodeAnchor,
  parseMindMap,
  serializeMindMap,
  updateNode,
  type MindMapDocument,
  type MindNode,
} from "@/lib/mindmap";
import { noteFileName, renderSimpleMarkdown } from "@/lib/simple-markdown";
import { cn } from "@/lib/utils";

const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 520;
const MIN_ZOOM = 0.55;
const MAX_ZOOM = 1.4;

function loadDocument(): MindMapDocument {
  if (typeof window === "undefined") return createDefaultMindMap();
  return parseMindMap(window.localStorage.getItem(MINDMAP_STORAGE_KEY)) ?? createDefaultMindMap();
}

function Connector({ from, to, color }: { from: MindNode; to: MindNode; color: string }) {
  const { x1, y1, x2, y2, c1x, c1y, c2x, c2y } = nodeAnchor(from, to, NODE_WIDTH, NODE_HEIGHT);
  return (
    <path
      d={`M ${x1} ${y1} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x2} ${y2}`}
      fill="none"
      stroke={color}
      strokeOpacity={0.75}
      strokeWidth={1.75}
      strokeLinecap="round"
    />
  );
}

export function TargetsMindmap() {
  const [document, setDocument] = React.useState<MindMapDocument>(createDefaultMindMap);
  const [hydrated, setHydrated] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [zoom, setZoom] = React.useState(0.95);
  const [pan, setPan] = React.useState({ x: 12, y: 12 });
  const [saved, setSaved] = React.useState(true);
  const [dragPos, setDragPos] = React.useState<Record<string, { x: number; y: number }> | null>(null);
  const panning = React.useRef(false);
  const panOrigin = React.useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  React.useEffect(() => {
    const next = loadDocument();
    setDocument(next);
    setSelectedId(getRootNode(next.nodes)?.id ?? null);
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(MINDMAP_STORAGE_KEY, serializeMindMap(document));
      setSaved(true);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [document, hydrated]);

  const root = getRootNode(document.nodes);
  const selected = document.nodes.find((node) => node.id === selectedId) ?? null;

  const displayNodes = React.useMemo(() => {
    if (!dragPos) return document.nodes;
    return document.nodes.map((node) => {
      const live = dragPos[node.id];
      return live ? { ...node, x: live.x, y: live.y } : node;
    });
  }, [document.nodes, dragPos]);

  const fileNodes = React.useMemo(() => {
    const order: MindNode[] = [];
    const visit = (id: string) => {
      const node = document.nodes.find((n) => n.id === id);
      if (!node) return;
      order.push(node);
      for (const child of document.nodes.filter((n) => n.parentId === id)) visit(child.id);
    };
    if (root) visit(root.id);
    for (const node of document.nodes) {
      if (!order.some((n) => n.id === node.id)) order.push(node);
    }
    return order;
  }, [document.nodes, root]);

  function commit(next: MindMapDocument, nextSelectedId?: string | null) {
    setDocument(next);
    setSaved(false);
    if (nextSelectedId !== undefined) setSelectedId(nextSelectedId);
  }

  function addBranch() {
    if (!selected) return;
    const next = addChildNode(document, selected.id);
    const created = next.nodes[next.nodes.length - 1];
    commit(next, created?.id ?? selected.id);
  }

  function addCallout() {
    if (!selected) return;
    const next = addChildNode(document, selected.id, "Note", "callout");
    const created = next.nodes[next.nodes.length - 1];
    commit(next, created?.id ?? selected.id);
  }

  function resetSheet() {
    const next = createDefaultMindMap();
    setDragPos(null);
    commit(next, getRootNode(next.nodes)?.id ?? null);
  }

  function removeSelected() {
    if (!selected || !root || selected.id === root.id) return;
    commit(deleteNode(document, selected.id), root.id);
  }

  function clampZoom(value: number) {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(value.toFixed(2))));
  }

  function onViewportWheel(event: React.WheelEvent) {
    if (!(event.ctrlKey || event.metaKey)) return;
    event.preventDefault();
    setZoom((value) => clampZoom(value + (event.deltaY > 0 ? -0.08 : 0.08)));
  }

  function startPan(event: React.PointerEvent<HTMLDivElement>) {
    if (dragPos) return;
    const target = event.target as HTMLElement;
    if (target.closest("[data-mind-node]")) return;
    if (event.button !== 0 && event.button !== 1) return;
    panning.current = true;
    panOrigin.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function movePan(event: React.PointerEvent<HTMLDivElement>) {
    if (!panning.current) return;
    setPan({
      x: panOrigin.current.panX + (event.clientX - panOrigin.current.x),
      y: panOrigin.current.panY + (event.clientY - panOrigin.current.y),
    });
  }

  function endPan(event: React.PointerEvent<HTMLDivElement>) {
    if (!panning.current) return;
    panning.current = false;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }
  }

  const previewHtml = selected ? renderSimpleMarkdown(selected.note || "_Empty note_") : "";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium text-violet-300/80">Target notebook</p>
          <input
            aria-label="Mind map title"
            value={document.title}
            onChange={(event) => commit({ ...document, title: event.target.value, updatedAt: new Date().toISOString() })}
            className="mt-1 w-full max-w-lg bg-transparent font-sans text-2xl font-semibold tracking-tight text-zinc-100 outline-none placeholder:text-zinc-600"
            placeholder="Targets"
          />
          <p className="mt-1 font-sans text-sm text-zinc-500">
            Sample:{" "}
            <a href="https://linktr.ee/ihe1la" target="_blank" rel="noreferrer" className="text-violet-300 hover:text-violet-200">
              linktr.ee/ihe1la
            </a>
            {" · "}
            {saved ? "Saved locally" : "Saving…"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={addBranch}
            disabled={!selected}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-violet-400/30 bg-violet-500/15 px-3 text-xs font-medium text-violet-100 disabled:opacity-40"
          >
            <GitBranchPlus className="h-3.5 w-3.5" />
            Add branch
          </button>
          <button
            type="button"
            onClick={addCallout}
            disabled={!selected}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/[.1] px-3 text-xs font-medium text-zinc-300 disabled:opacity-40"
          >
            Add note
          </button>
          <button
            type="button"
            onClick={removeSelected}
            disabled={!selected || selected.id === root?.id}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/[.1] px-3 text-xs font-medium text-zinc-400 disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
          <button
            type="button"
            onClick={resetSheet}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/[.1] px-3 text-xs font-medium text-zinc-400"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset sample
          </button>
        </div>
      </div>

      <div
        aria-label="Targets mindmap canvas"
        onWheel={onViewportWheel}
        onPointerDown={startPan}
        onPointerMove={movePan}
        onPointerUp={endPan}
        onPointerCancel={endPan}
        className="relative h-[420px] cursor-grab overflow-hidden rounded-xl border border-violet-400/15 bg-[#0b0c12] active:cursor-grabbing [background-image:radial-gradient(rgba(139,108,255,.1)_1px,transparent_1px)] [background-size:20px_20px]"
      >
        <div className="absolute right-3 top-3 z-30 flex overflow-hidden rounded-md border border-white/[.08] bg-[#0d0e14]/95">
          <button type="button" aria-label="Zoom out" onClick={() => setZoom((v) => clampZoom(v - 0.1))} className="grid h-8 w-8 place-items-center text-zinc-400 hover:text-zinc-100">
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="grid w-11 place-items-center border-x border-white/[.06] font-sans text-[11px] text-zinc-500">{Math.round(zoom * 100)}%</span>
          <button type="button" aria-label="Zoom in" onClick={() => setZoom((v) => clampZoom(v + 0.1))} className="grid h-8 w-8 place-items-center text-zinc-400 hover:text-zinc-100">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
            {displayNodes
              .filter((node) => node.parentId)
              .map((node) => {
                const parent = displayNodes.find((candidate) => candidate.id === node.parentId);
                if (!parent) return null;
                return <Connector key={`line-${node.id}`} from={parent} to={node} color={branchColor(document.nodes, node.id)} />;
              })}
          </svg>

          {displayNodes.map((node) => {
            const isRoot = node.parentId === null;
            const isSelected = selected?.id === node.id;
            const isCallout = node.kind === "callout";
            const color = branchColor(document.nodes, node.id);
            return (
              <Rnd
                key={node.id}
                position={{ x: node.x, y: node.y }}
                size={{ width: NODE_WIDTH, height: NODE_HEIGHT }}
                bounds="parent"
                enableResizing={false}
                onDragStart={() => setSelectedId(node.id)}
                onDrag={(_, data) => {
                  setDragPos((prev) => ({ ...(prev ?? {}), [node.id]: { x: data.x, y: data.y } }));
                }}
                onDragStop={(_, data) => {
                  setDragPos(null);
                  commit(updateNode(document, node.id, { x: data.x, y: data.y }));
                }}
              >
                <article
                  data-mind-node
                  onClick={() => setSelectedId(node.id)}
                  className={cn(
                    "flex h-full cursor-grab items-center rounded-lg border px-3 active:cursor-grabbing",
                    isCallout ? "border-dashed bg-[#14121c]" : "bg-[#12131a]",
                    isSelected ? "border-violet-400/70 ring-1 ring-violet-400/30" : "border-white/[.1]",
                    isRoot && "bg-violet-500/20",
                  )}
                  style={{ borderColor: isSelected ? undefined : `${color}88` }}
                >
                  <input
                    aria-label={isRoot ? "Central topic" : "Target title"}
                    value={node.text}
                    onFocus={() => setSelectedId(node.id)}
                    onChange={(event) => commit(updateNode(document, node.id, { text: event.target.value }))}
                    className={cn(
                      "w-full truncate bg-transparent font-sans text-[13px] text-zinc-100 outline-none placeholder:text-zinc-600",
                      isRoot && "font-semibold",
                    )}
                    placeholder="Untitled"
                  />
                </article>
              </Rnd>
            );
          })}
        </div>
      </div>

      <section
        aria-label="Obsidian vault"
        className="overflow-hidden rounded-xl border border-violet-400/15 bg-[#111218]"
      >
        <div className="flex items-center justify-between border-b border-white/[.06] bg-[#161822] px-4 py-2">
          <div className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-violet-300" />
            <p className="font-sans text-xs font-medium text-zinc-300">Obsidian vault</p>
          </div>
          <p className="font-sans text-[11px] text-zinc-500">Synced to map nodes</p>
        </div>

        <div className="grid min-h-[260px] lg:grid-cols-[200px_minmax(0,1fr)_minmax(0,1fr)]">
          <aside className="border-b border-white/[.06] bg-[#0e0f16] lg:border-b-0 lg:border-r lg:border-white/[.06]" aria-label="Vault files">
            <p className="px-3 py-2 font-sans text-[11px] font-medium text-zinc-500">Notes</p>
            <ul className="max-h-[220px] overflow-y-auto pb-2 lg:max-h-[320px]">
              {fileNodes.map((node) => {
                const active = selected?.id === node.id;
                return (
                  <li key={node.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(node.id)}
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-1.5 text-left font-sans text-[12px]",
                        active ? "bg-violet-500/15 text-zinc-100" : "text-zinc-500 hover:bg-white/[.04] hover:text-zinc-300",
                      )}
                    >
                      <FileText className="h-3 w-3 shrink-0 opacity-70" />
                      <span className="truncate">{noteFileName(node.text)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          {selected ? (
            <>
              <div className="flex min-h-[220px] flex-col border-b border-white/[.06] lg:border-b-0 lg:border-r lg:border-white/[.06]">
                <div className="border-b border-white/[.06] px-3 py-2 font-sans text-[11px] text-zinc-500">
                  Source · {noteFileName(selected.text)}
                </div>
                <textarea
                  aria-label="Node note"
                  value={selected.note}
                  onChange={(event) => commit(updateNode(document, selected.id, { note: event.target.value }))}
                  placeholder={"# Notes\n\n- Findings\n- Evidence"}
                  className="min-h-[200px] flex-1 resize-none bg-[#111218] px-4 py-3 font-sans text-[13px] leading-6 text-zinc-300 outline-none placeholder:text-zinc-600 lg:min-h-[300px]"
                />
              </div>
              <div className="flex min-h-[200px] flex-col bg-[#0e0f16]">
                <div className="border-b border-white/[.06] px-3 py-2 font-sans text-[11px] text-zinc-500">Preview</div>
                <div
                  aria-label="Note preview"
                  className="min-h-[180px] flex-1 overflow-y-auto px-4 py-3 font-sans text-[13px] leading-6 text-zinc-400 [&_.md-h1]:mb-2 [&_.md-h1]:text-lg [&_.md-h1]:font-semibold [&_.md-h1]:text-zinc-100 [&_.md-h2]:mb-2 [&_.md-h2]:text-base [&_.md-h2]:font-semibold [&_.md-h2]:text-zinc-100 [&_.md-h3]:mb-1 [&_.md-h3]:font-medium [&_.md-h3]:text-zinc-200 [&_.md-p]:mb-2 [&_.md-ul]:mb-2 [&_.md-ul]:list-disc [&_.md-ul]:pl-5 [&_.md-ol]:mb-2 [&_.md-ol]:list-decimal [&_.md-ol]:pl-5 [&_.md-code]:rounded [&_.md-code]:bg-violet-500/10 [&_.md-code]:px-1 [&_.md-code]:font-mono [&_.md-code]:text-[11px] [&_.md-code]:text-violet-200 [&_.md-pre]:mb-2 [&_.md-pre]:rounded-md [&_.md-pre]:bg-[#0a0b12] [&_.md-pre]:p-2 [&_.md-pre]:font-mono [&_.md-pre]:text-[11px] [&_.md-a]:text-violet-300 [&_.md-a]:underline"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </div>
            </>
          ) : (
            <div className="col-span-2 grid place-items-center px-6 py-12 text-center">
              <p className="font-sans text-sm text-zinc-500">Select a topic on the map or a file in the vault.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
