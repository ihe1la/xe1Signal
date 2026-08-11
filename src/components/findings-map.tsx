"use client";

import * as React from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Node,
  type NodeChange,
  type NodeProps,
} from "@xyflow/react";
import { RotateCcw } from "lucide-react";
import {
  FINDINGS_MAP_STORAGE_KEY,
  buildFindingsMapGraph,
  parseFindingsMap,
  positionsFromNodes,
  serializeFindingsMap,
  type FindingsMapNodeData,
} from "@/lib/findings-map";
import type { Finding } from "@/lib/findings";
import { cn } from "@/lib/utils";

type MapNode = Node<FindingsMapNodeData>;

function FindingsFlowNode({ data, selected }: NodeProps<MapNode>) {
  const tone =
    data.kind === "root"
      ? "border-violet-400/40 bg-violet-500/15 text-violet-50"
      : data.kind === "target"
        ? "border-violet-300/25 bg-[#12131a] text-zinc-100"
        : "border-white/[.1] bg-[#0d0e14] text-zinc-300";

  return (
    <div
      className={cn(
        "relative min-w-[160px] max-w-[240px] rounded-xl border px-3 py-2.5 shadow-lg shadow-black/30",
        tone,
        selected && "ring-1 ring-violet-300/50",
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2 !w-2 !border-0 !bg-violet-400/70"
      />
      <p className="font-sans text-[9px] uppercase tracking-[.14em] text-zinc-500">
        {data.kind === "root" ? "Map" : data.kind === "target" ? "Target" : "Note"}
      </p>
      <p className="mt-1 font-sans text-[12px] font-medium leading-5">{data.label}</p>
      {data.detail ? <p className="mt-1 truncate font-mono text-[9px] text-zinc-600">{data.detail}</p> : null}
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2 !w-2 !border-0 !bg-violet-400/70"
      />
    </div>
  );
}

const nodeTypes = { findingsNode: FindingsFlowNode };

function FindingsMapCanvas({
  findings,
  onSelectFinding,
}: {
  findings: Finding[];
  onSelectFinding?: (findingId: string) => void;
}) {
  const [hydrated, setHydrated] = React.useState(false);
  const [savedPositions, setSavedPositions] = React.useState<Record<string, { x: number; y: number }>>({});
  const graph = React.useMemo(() => buildFindingsMapGraph(findings, savedPositions), [findings, savedPositions]);
  const [nodes, setNodes, onNodesChangeBase] = useNodesState<MapNode>(graph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graph.edges);

  React.useEffect(() => {
    const document = parseFindingsMap(window.localStorage.getItem(FINDINGS_MAP_STORAGE_KEY));
    setSavedPositions(document.positions);
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    setNodes(graph.nodes);
    setEdges(graph.edges);
  }, [graph.edges, graph.nodes, hydrated, setEdges, setNodes]);

  function persistPositions(nextNodes: MapNode[]) {
    const positions = positionsFromNodes(nextNodes);
    setSavedPositions(positions);
    window.localStorage.setItem(
      FINDINGS_MAP_STORAGE_KEY,
      serializeFindingsMap({ positions, updatedAt: new Date().toISOString() }),
    );
  }

  function onNodesChange(changes: NodeChange<MapNode>[]) {
    onNodesChangeBase(changes);
    const finishedDrag = changes.some((change) => change.type === "position" && change.dragging === false);
    if (!finishedDrag) return;
    // Read latest positions after the base handler applied changes on next tick.
    window.requestAnimationFrame(() => {
      setNodes((current) => {
        persistPositions(current);
        return current;
      });
    });
  }

  function resetLayout() {
    window.localStorage.removeItem(FINDINGS_MAP_STORAGE_KEY);
    setSavedPositions({});
  }

  return (
    <div aria-label="Findings map" className="overflow-hidden rounded-2xl border border-white/[.08] bg-[#08090d]">
      <div className="flex items-center justify-between border-b border-white/[.06] px-4 py-3">
        <div>
          <p className="font-sans text-[11px] uppercase tracking-[.14em] text-violet-300/80">Target map</p>
          <p className="mt-1 font-sans text-[12px] text-zinc-500">
            Notes grouped by host/tag · drag freely · layout is saved in this browser
          </p>
        </div>
        <button
          type="button"
          onClick={resetLayout}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/[.08] px-3 font-sans text-[11px] text-zinc-500 transition hover:border-violet-400/25 hover:text-violet-200"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset layout
        </button>
      </div>
      <div className="h-[560px] w-full">
        {!hydrated ? (
          <div className="grid h-full place-items-center font-sans text-sm text-zinc-600">Loading map…</div>
        ) : findings.length === 0 ? (
          <div className="grid h-full place-items-center px-6 text-center font-sans text-sm text-zinc-500">
            Save a finding first, then it will appear under its target here.
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.35}
            maxZoom={1.6}
            proOptions={{ hideAttribution: true }}
            onNodeClick={(_, node) => {
              if (node.data.findingId) onSelectFinding?.(node.data.findingId);
            }}
            colorMode="dark"
          >
            <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="rgba(255,255,255,0.04)" />
            <Controls className="!border-white/10 !bg-[#111218] !shadow-none [&>button]:!border-white/10 [&>button]:!bg-[#111218] [&>button]:!fill-zinc-300" />
            <MiniMap
              pannable
              zoomable
              className="!border-white/10 !bg-[#0d0e14]"
              maskColor="rgba(8,9,13,.7)"
              nodeColor={(node) => {
                const kind = node.data?.kind;
                if (kind === "root") return "#8b6cff";
                if (kind === "target") return "#a78bfa";
                return "#3f3f46";
              }}
            />
          </ReactFlow>
        )}
      </div>
    </div>
  );
}

export function FindingsMap({
  findings,
  onSelectFinding,
}: {
  findings: Finding[];
  onSelectFinding?: (findingId: string) => void;
}) {
  return (
    <ReactFlowProvider>
      <FindingsMapCanvas findings={findings} onSelectFinding={onSelectFinding} />
    </ReactFlowProvider>
  );
}
