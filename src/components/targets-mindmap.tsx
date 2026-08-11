"use client";

import * as React from "react";
import { Rnd } from "react-rnd";
import { FileText, GitBranchPlus, Minus, Plus, RotateCcw, Trash2 } from "lucide-react";
import {
  MINDMAP_STORAGE_KEY,
  addChildNode,
  branchColor,
  createDefaultMindMap,
  deleteNode,
  getRootNode,
  parseMindMap,
  serializeMindMap,
  updateNode,
  type MindMapDocument,
  type MindNode,
} from "@/lib/mindmap";
import { noteFileName, renderSimpleMarkdown } from "@/lib/simple-markdown";
import { cn } from "@/lib/utils";

const CANVAS_WIDTH = 1600;
const CANVAS_HEIGHT = 1100;
const NODE_WIDTH = 188;
const NODE_HEIGHT = 86;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 1.6;

function loadDocument(): MindMapDocument {
  if (typeof window === "undefined") return createDefaultMindMap();
  return parseMindMap(window.localStorage.getItem(MINDMAP_STORAGE_KEY)) ?? createDefaultMindMap();
}

function Connector({ from, to, color }: { from: MindNode; to: MindNode; color: string }) {
  const x1 = from.x + NODE_WIDTH / 2;
  const y1 = from.y + NODE_HEIGHT / 2;
  const x2 = to.x + NODE_WIDTH / 2;
  const y2 = to.y + NODE_HEIGHT / 2;
  const dx = Math.abs(x2 - x1) * 0.45;
  return (
    <path
      d={`M ${x1} ${y1} C ${x1 + (x2 > x1 ? dx : -dx)} ${y1}, ${x2 + (x2 > x1 ? -dx : dx)} ${y2}, ${x2} ${y2}`}
      fill="none"
      stroke={color}
      strokeOpacity={0.55}
      strokeWidth={2.5}
      strokeLinecap="round"
    />
  );
}

export function TargetsMindmap() {
  const [document, setDocument] = React.useState<MindMapDocument>(createDefaultMindMap);
  const [hydrated, setHydrated] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [zoom, setZoom] = React.useState(0.85);
  const [pan, setPan] = React.useState({ x: 40, y: 24 });
  const [saved, setSaved] = React.useState(true);
  const [draggingNode, setDraggingNode] = React.useState(false);
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const panRef = React.useRef<{ active: boolean; startX: number; startY: number; originX: number; originY: number } | null>(null);

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
    }, 400);
    return () => window.clearTimeout(timer);
  }, [document, hydrated]);

  const root = getRootNode(document.nodes);
  const selected = document.nodes.find((node) => node.id === selectedId) ?? null;
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
    const next = addChildNode(document, selected.id, "Threat model", "callout");
    const created = next.nodes[next.nodes.length - 1];
    commit(next, created?.id ?? selected.id);
  }

  function resetSheet() {
    const next = createDefaultMindMap();
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
    const delta = event.deltaY > 0 ? -0.08 : 0.08;
    setZoom((value) => clampZoom(value + delta));
  }

  function startPan(event: React.PointerEvent<HTMLDivElement>) {
    if (draggingNode) return;
    const target = event.target as HTMLElement;
    if (target.closest("[data-mind-node]")) return;
    if (event.button !== 0 && event.button !== 1) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    panRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      originX: pan.x,
      originY: pan.y,
    };
  }

  function movePan(event: React.PointerEvent<HTMLDivElement>) {
    const state = panRef.current;
    if (!state?.active) return;
    setPan({
      x: state.originX + (event.clientX - state.startX),
      y: state.originY + (event.clientY - state.startY),
    });
  }

  function endPan(event: React.PointerEvent<HTMLDivElement>) {
    if (!panRef.current?.active) return;
    panRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }
  }

  const previewHtml = selected ? renderSimpleMarkdown(selected.note || "_Empty note_") : "";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-rose-300 shadow-[0_0_14px_rgba(253,164,175,.65)]" />
            <p className="font-mono text-[10px] uppercase tracking-[.16em] text-rose-200/70">Target notebook</p>
          </div>
          <input
            aria-label="Mind map title"
            value={document.title}
            onChange={(event) => commit({ ...document, title: event.target.value, updatedAt: new Date().toISOString() })}
            className="mt-1 w-full max-w-md bg-transparent font-sans text-xl font-medium tracking-tight text-zinc-100 outline-none placeholder:text-zinc-600 sm:text-2xl"
            placeholder="Targets"
          />
          <p className="mt-1 font-sans text-xs text-zinc-500">
            XMind-style map on top · Obsidian vault below. {saved ? "Saved in this browser." : "Saving…"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={addBranch}
            disabled={!selected}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-violet-300/25 bg-violet-400/[.1] px-3 font-mono text-[10px] text-violet-200 transition hover:border-violet-300/40 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <GitBranchPlus className="h-3.5 w-3.5" />
            Add branch
          </button>
          <button
            type="button"
            onClick={addCallout}
            disabled={!selected}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-orange-300/30 bg-orange-400/[.08] px-3 font-mono text-[10px] text-orange-200 transition hover:border-orange-200/50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span className="h-2.5 w-2.5 rounded-[2px] border border-dashed border-orange-300" />
            Add callout
          </button>
          <button
            type="button"
            onClick={removeSelected}
            disabled={!selected || selected.id === root?.id}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/[.08] px-3 font-mono text-[10px] text-zinc-400 transition hover:border-white/[.14] hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
          <button
            type="button"
            onClick={resetSheet}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/[.08] px-3 font-mono text-[10px] text-zinc-400 transition hover:border-white/[.14] hover:text-zinc-200"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        </div>
      </div>

      <div
        ref={viewportRef}
        aria-label="Targets mindmap canvas"
        onWheel={onViewportWheel}
        onPointerDown={startPan}
        onPointerMove={movePan}
        onPointerUp={endPan}
        onPointerCancel={endPan}
        className="relative h-[62vh] min-h-[520px] cursor-grab overflow-hidden rounded-2xl border border-rose-200/[.14] bg-[#14080c] shadow-[inset_0_0_90px_rgba(244,63,94,.07),0_18px_70px_rgba(0,0,0,.28)] active:cursor-grabbing [background-image:radial-gradient(rgba(255,210,210,.11)_1px,transparent_1px)] [background-size:22px_22px]"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-28 bg-gradient-to-b from-rose-300/[.07] to-transparent" />
        <div className="pointer-events-none absolute left-5 top-5 z-20 rounded-lg border border-white/[.08] bg-[#1b0d12]/85 px-3 py-2 backdrop-blur">
          <p className="font-mono text-[9px] uppercase tracking-[.14em] text-zinc-500">XMind canvas</p>
          <p className="mt-1 font-sans text-[11px] text-zinc-300">Drag map · Ctrl+wheel zoom · drag topics</p>
        </div>
        <div className="absolute right-4 top-4 z-30 flex overflow-hidden rounded-lg border border-white/[.08] bg-[#0d0e13]/90 backdrop-blur">
          <button type="button" aria-label="Zoom out" onClick={() => setZoom((value) => clampZoom(value - 0.1))} className="grid h-9 w-9 place-items-center text-zinc-400 hover:text-zinc-200">
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="grid w-12 place-items-center border-x border-white/[.06] font-mono text-[9px] text-zinc-500">{Math.round(zoom * 100)}%</span>
          <button type="button" aria-label="Zoom in" onClick={() => setZoom((value) => clampZoom(value + 0.1))} className="grid h-9 w-9 place-items-center text-zinc-400 hover:text-zinc-200">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        <div
          className="absolute left-0 top-0 origin-top-left will-change-transform"
          style={{
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
            {document.nodes
              .filter((node) => node.parentId)
              .map((node) => {
                const parent = document.nodes.find((candidate) => candidate.id === node.parentId);
                if (!parent) return null;
                return <Connector key={`line-${node.id}`} from={parent} to={node} color={branchColor(document.nodes, node.id)} />;
              })}
          </svg>

          {document.nodes.map((node) => {
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
                disableDragging={false}
                onDragStart={() => {
                  setDraggingNode(true);
                  setSelectedId(node.id);
                }}
                onDragStop={(_, data) => {
                  setDraggingNode(false);
                  commit(updateNode(document, node.id, { x: data.x, y: data.y }));
                }}
              >
                <article
                  data-mind-node
                  onClick={() => setSelectedId(node.id)}
                  className={cn(
                    "flex h-full cursor-grab flex-col border px-3 py-2.5 shadow-[0_14px_36px_rgba(0,0,0,.45)] active:cursor-grabbing",
                    isCallout ? "rounded-md border-dashed border-orange-400/55 bg-[#3a1b1c]/92" : "rounded-full bg-[#241318]/96",
                    isSelected ? "border-violet-300/45 ring-2 ring-violet-300/25" : "border-white/[.1]",
                    isRoot && "rounded-[22px] bg-gradient-to-br from-rose-300/25 to-[#2a1218] font-semibold",
                  )}
                  style={{ borderColor: isSelected ? undefined : `${color}55`, boxShadow: isRoot ? `0 0 0 1px ${color}44, 0 16px 40px rgba(0,0,0,.45)` : undefined }}
                >
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                    <span className="truncate font-mono text-[8px] uppercase tracking-[.12em] text-zinc-500">
                      {isRoot ? "Central topic" : isCallout ? "Callout" : "Topic"}
                    </span>
                  </div>
                  <input
                    aria-label={isRoot ? "Central topic" : "Target title"}
                    value={node.text}
                    onFocus={() => setSelectedId(node.id)}
                    onChange={(event) => commit(updateNode(document, node.id, { text: event.target.value }))}
                    className={cn(
                      "w-full bg-transparent font-sans text-[13px] text-zinc-100 outline-none placeholder:text-zinc-600",
                      isRoot && "text-sm font-semibold",
                    )}
                    placeholder="Untitled"
                  />
                  {node.note ? <p className="mt-1 line-clamp-1 font-sans text-[10px] leading-4 text-zinc-500">{node.note}</p> : null}
                </article>
              </Rnd>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 px-1 font-mono text-[9px] uppercase tracking-[.12em] text-zinc-600">
        <span className="inline-flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-violet-300" />Branch = attack path</span>
        <span className="inline-flex items-center gap-2"><i className="h-2 w-2 rounded-[2px] border border-dashed border-orange-300" />Callout = threat / proof</span>
        <span className="ml-auto">Local only</span>
      </div>

      <section
        aria-label="Obsidian vault"
        className="overflow-hidden rounded-xl border border-[#3d3d3d] bg-[#1e1e1e] shadow-[0_18px_50px_rgba(0,0,0,.35)]"
      >
        <div className="flex items-center justify-between border-b border-[#333] bg-[#262626] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-[#a882ff]" />
            <p className="font-mono text-[10px] uppercase tracking-[.14em] text-[#b0b0b0]">Obsidian vault</p>
          </div>
          <p className="font-mono text-[10px] text-[#777]">Synced to map nodes · markdown</p>
        </div>

        <div className="grid min-h-[320px] lg:grid-cols-[220px_minmax(0,1fr)_minmax(0,1fr)]">
          <aside className="border-b border-[#333] bg-[#1a1a1a] lg:border-b-0 lg:border-r" aria-label="Vault files">
            <p className="px-3 py-2 font-mono text-[9px] uppercase tracking-[.12em] text-[#666]">Notes</p>
            <ul className="max-h-[280px] overflow-y-auto pb-2 lg:max-h-[420px]">
              {fileNodes.map((node) => {
                const active = selected?.id === node.id;
                return (
                  <li key={node.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(node.id)}
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-1.5 text-left font-mono text-[11px] transition",
                        active ? "bg-[#363636] text-[#e6e6e6]" : "text-[#9a9a9a] hover:bg-[#2a2a2a] hover:text-[#d0d0d0]",
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
              <div className="flex min-h-[280px] flex-col border-b border-[#333] lg:border-b-0 lg:border-r">
                <div className="border-b border-[#333] px-3 py-2 font-mono text-[10px] text-[#888]">
                  Source · {noteFileName(selected.text)}
                </div>
                <textarea
                  aria-label="Node note"
                  value={selected.note}
                  onChange={(event) => commit(updateNode(document, selected.id, { note: event.target.value }))}
                  placeholder={"# Notes\n\n- Findings\n- Evidence\n- Next steps"}
                  className="min-h-[260px] flex-1 resize-none bg-[#1e1e1e] px-4 py-3 font-mono text-[12px] leading-6 text-[#d4d4d4] outline-none placeholder:text-[#555] lg:min-h-[380px]"
                />
              </div>
              <div className="flex min-h-[240px] flex-col bg-[#202020]">
                <div className="border-b border-[#333] px-3 py-2 font-mono text-[10px] text-[#888]">Preview</div>
                <div
                  aria-label="Note preview"
                  className="prose-invert min-h-[220px] flex-1 overflow-y-auto px-4 py-3 text-[13px] leading-6 text-[#c8c8c8] [&_.md-h1]:mb-2 [&_.md-h1]:text-xl [&_.md-h1]:font-semibold [&_.md-h1]:text-[#f0f0f0] [&_.md-h2]:mb-2 [&_.md-h2]:text-lg [&_.md-h2]:font-semibold [&_.md-h2]:text-[#ececec] [&_.md-h3]:mb-1.5 [&_.md-h3]:text-base [&_.md-h3]:font-medium [&_.md-h3]:text-[#e0e0e0] [&_.md-p]:mb-2 [&_.md-ul]:mb-2 [&_.md-ul]:list-disc [&_.md-ul]:pl-5 [&_.md-ol]:mb-2 [&_.md-ol]:list-decimal [&_.md-ol]:pl-5 [&_.md-code]:rounded [&_.md-code]:bg-[#2d2d2d] [&_.md-code]:px-1 [&_.md-code]:py-0.5 [&_.md-code]:font-mono [&_.md-code]:text-[11px] [&_.md-pre]:mb-3 [&_.md-pre]:overflow-x-auto [&_.md-pre]:rounded-md [&_.md-pre]:bg-[#141414] [&_.md-pre]:p-3 [&_.md-pre]:font-mono [&_.md-pre]:text-[11px] [&_.md-a]:text-[#a882ff] [&_.md-a]:underline"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </div>
            </>
          ) : (
            <div className="col-span-2 grid place-items-center px-6 py-16 text-center">
              <p className="font-sans text-sm text-[#888]">Select a topic on the map or a file in the vault.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
