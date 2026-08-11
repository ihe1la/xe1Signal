"use client";

import * as React from "react";
import { Rnd } from "react-rnd";
import { GitBranchPlus, Minus, Plus, RotateCcw, Trash2 } from "lucide-react";
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
import { cn } from "@/lib/utils";

const CANVAS_WIDTH = 940;
const CANVAS_HEIGHT = 720;
const NODE_WIDTH = 178;
const NODE_HEIGHT = 92;

function loadDocument(): MindMapDocument {
  if (typeof window === "undefined") return createDefaultMindMap();
  return parseMindMap(window.localStorage.getItem(MINDMAP_STORAGE_KEY)) ?? createDefaultMindMap();
}

function Connector({ from, to, color }: { from: MindNode; to: MindNode; color: string }) {
  const x1 = from.x + NODE_WIDTH / 2;
  const y1 = from.y + NODE_HEIGHT / 2;
  const x2 = to.x + NODE_WIDTH / 2;
  const y2 = to.y + NODE_HEIGHT / 2;
  const midX = (x1 + x2) / 2;
  return (
    <path
      d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
      fill="none"
      stroke={color}
      strokeOpacity={0.45}
      strokeWidth={2}
    />
  );
}

export function TargetsMindmap() {
  const [document, setDocument] = React.useState<MindMapDocument>(createDefaultMindMap);
  const [hydrated, setHydrated] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [zoom, setZoom] = React.useState(1);
  const [saved, setSaved] = React.useState(true);

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
  const selected = document.nodes.find((node) => node.id === selectedId) ?? root;

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

  return (
    <div className="space-y-4">
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
            A local bug-hunting map for scope, hypotheses, evidence, and impact. {saved ? "Saved in this browser." : "Saving…"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={addBranch}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-violet-300/25 bg-violet-400/[.1] px-3 font-mono text-[10px] text-violet-200 transition hover:border-violet-300/40"
          >
            <GitBranchPlus className="h-3.5 w-3.5" />
            Add branch
          </button>
          <button
            type="button"
            onClick={addCallout}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-orange-300/30 bg-orange-400/[.08] px-3 font-mono text-[10px] text-orange-200 transition hover:border-orange-200/50"
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

      <div aria-label="Targets mindmap canvas" className="relative h-[68vh] min-h-[560px] overflow-auto rounded-2xl border border-rose-200/[.12] bg-[#16090d] shadow-[inset_0_0_90px_rgba(244,63,94,.06),0_18px_70px_rgba(0,0,0,.25)] [background-image:radial-gradient(rgba(255,210,210,.1)_1px,transparent_1px)] [background-size:24px_24px]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-rose-300/[.06] to-transparent" />
        <div className="pointer-events-none absolute left-5 top-5 z-20 rounded-lg border border-white/[.08] bg-[#1b0d12]/80 px-3 py-2 backdrop-blur">
          <p className="font-mono text-[9px] uppercase tracking-[.14em] text-zinc-500">Bug hunt canvas</p>
          <p className="mt-1 font-sans text-[11px] text-zinc-300">Drag nodes · click to edit · keep proof small</p>
        </div>
        <div className="absolute right-4 top-4 z-30 flex overflow-hidden rounded-lg border border-white/[.08] bg-[#0d0e13]/90 backdrop-blur">
          <button type="button" aria-label="Zoom out" onClick={() => setZoom((value) => Math.max(0.6, Number((value - 0.1).toFixed(1))))} className="grid h-9 w-9 place-items-center text-zinc-400 hover:text-zinc-200">
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="grid w-12 place-items-center border-x border-white/[.06] font-mono text-[9px] text-zinc-500">{Math.round(zoom * 100)}%</span>
          <button type="button" aria-label="Zoom in" onClick={() => setZoom((value) => Math.min(1.5, Number((value + 0.1).toFixed(1))))} className="grid h-9 w-9 place-items-center text-zinc-400 hover:text-zinc-200">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="relative origin-top-left" style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT, transform: `scale(${zoom})` }}>
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
                onDragStart={() => setSelectedId(node.id)}
                onDragStop={(_, data) => commit(updateNode(document, node.id, { x: data.x, y: data.y }))}
              >
                <article
                  onClick={() => setSelectedId(node.id)}
                  className={cn(
                    "flex h-full cursor-grab flex-col border p-3 shadow-[0_12px_40px_rgba(0,0,0,.4)] active:cursor-grabbing",
                    isCallout ? "rounded-md border-dashed border-orange-400/60 bg-[#3a1b1c]/90" : "rounded-xl bg-[#211116]/95",
                    isSelected ? "border-violet-300/40 ring-1 ring-violet-300/20" : "border-white/[.09]",
                    isRoot && "rounded-lg bg-rose-300/[.16]",
                  )}
                  style={{ borderColor: isSelected ? undefined : `${color}33` }}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                    <span className="font-mono text-[8px] uppercase tracking-[.12em] text-zinc-500">{isRoot ? "Central target" : isCallout ? "Threat / evidence" : "Target branch"}</span>
                  </div>
                  <input
                    aria-label={isRoot ? "Central topic" : "Target title"}
                    value={node.text}
                    onFocus={() => setSelectedId(node.id)}
                    onChange={(event) => commit(updateNode(document, node.id, { text: event.target.value }))}
                    className={cn("w-full bg-transparent font-sans text-sm text-zinc-100 outline-none placeholder:text-zinc-600", isRoot && "font-semibold")}
                    placeholder="Untitled"
                  />
                  {node.note ? <p className="mt-1 line-clamp-2 font-sans text-[10px] leading-4 text-zinc-500">{node.note}</p> : null}
                </article>
              </Rnd>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 px-1 font-mono text-[9px] uppercase tracking-[.12em] text-zinc-600">
        <span className="inline-flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-violet-300" />Branch = attack path or scope area</span>
        <span className="inline-flex items-center gap-2"><i className="h-2 w-2 rounded-[2px] border border-dashed border-orange-300" />Callout = threat model or proof</span>
        <span className="ml-auto">Local only · no friend-site tools</span>
      </div>

      {selected ? (
        <section className="rounded-xl border border-white/[.08] bg-white/[.02] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-sans text-sm text-zinc-200">{selected.text || "Untitled"}</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[.14em] text-zinc-600">
                {selected.parentId === null ? "Central target" : selected.kind === "callout" ? "Threat model / evidence" : "Scope branch"}
              </p>
            </div>
            <button
              type="button"
              onClick={selected.kind === "callout" ? addBranch : addCallout}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/[.08] px-3 font-mono text-[10px] text-zinc-400 transition hover:text-zinc-200"
            >
              <Plus className="h-3.5 w-3.5" />
              {selected.kind === "callout" ? "Add branch" : "Add callout"}
            </button>
          </div>
          <textarea
            aria-label="Node note"
            value={selected.note}
            onChange={(event) => commit(updateNode(document, selected.id, { note: event.target.value }))}
            rows={3}
            placeholder="Add notes for this target…"
            className="mt-4 w-full resize-y rounded-lg border border-white/[.07] bg-[#0b0c11] px-3 py-2.5 font-sans text-sm text-zinc-300 outline-none placeholder:text-zinc-600 focus:border-violet-300/30"
          />
        </section>
      ) : null}
    </div>
  );
}
