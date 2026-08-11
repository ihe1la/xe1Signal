"use client";

import * as React from "react";
import {
  Background,
  BackgroundVariant,
  BaseEdge,
  Controls,
  Handle,
  MiniMap,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  getBezierPath,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeChange,
  type NodeProps,
} from "@xyflow/react";
import { Crosshair, Globe2, RotateCcw, StickyNote } from "lucide-react";
import {
  FINDINGS_MAP_STORAGE_KEY,
  buildFindingsMapGraph,
  findingTargetKey,
  mergePositions,
  parseFindingsMap,
  positionsFromNodes,
  serializeFindingsMap,
  type FindingsMapEdgeData,
  type FindingsMapNodeData,
  type FindingsMapPositions,
} from "@/lib/findings-map";
import type { Finding } from "@/lib/findings";
import { cn } from "@/lib/utils";

type MapNode = Node<FindingsMapNodeData>;
type MapEdge = Edge<FindingsMapEdgeData>;

function FindingsFlowNode({ data, selected }: NodeProps<MapNode>) {
  const Icon = data.kind === "root" ? Crosshair : data.kind === "target" ? Globe2 : StickyNote;

  return (
    <div
      className={cn(
        "findings-turbo-node group relative min-w-[188px] max-w-[260px]",
        data.kind === "root" && "findings-turbo-node--root",
        data.kind === "target" && "findings-turbo-node--target",
        data.kind === "note" && "findings-turbo-node--note",
        data.fresh && "findings-turbo-node--fresh",
        selected && "is-selected",
      )}
    >
      <div className="findings-turbo-node__glow" aria-hidden />
      <div className="findings-turbo-node__body">
        <Handle
          type="target"
          position={Position.Left}
          className="findings-turbo-handle"
        />
        <div className="flex items-start gap-2.5">
          <span className="findings-turbo-node__icon grid h-8 w-8 shrink-0 place-items-center rounded-lg">
            <Icon className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="font-sans text-[9px] uppercase tracking-[0.16em] text-zinc-500">
              {data.kind === "root" ? "Map root" : data.kind === "target" ? "Target" : "Note"}
            </p>
            <p className="mt-1 font-sans text-[13px] font-medium leading-5 text-zinc-100">
              {data.label}
            </p>
            {data.detail ? (
              <p className="mt-1 truncate font-mono text-[10px] text-zinc-500">{data.detail}</p>
            ) : null}
            {data.kind === "note" && data.tags && data.tags.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {data.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md border border-violet-400/20 bg-violet-500/10 px-1.5 py-0.5 font-sans text-[9px] text-violet-200/90"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          {typeof data.noteCount === "number" && data.kind !== "note" ? (
            <span className="rounded-md border border-white/10 bg-black/30 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
              {data.noteCount}
            </span>
          ) : null}
        </div>
        <Handle
          type="source"
          position={Position.Right}
          className="findings-turbo-handle"
        />
      </div>
    </div>
  );
}

function FindingsFlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  data,
  style,
}: EdgeProps<MapEdge>) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  const spine = data?.kind === "spine";

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: "url(#findings-edge-gradient)",
          strokeWidth: spine ? 2.25 : 1.6,
          strokeOpacity: spine ? 0.9 : 0.7,
        }}
      />
      <path
        d={edgePath}
        fill="none"
        strokeWidth={spine ? 2.25 : 1.6}
        className={cn("findings-edge-pulse", spine && "findings-edge-pulse--spine")}
      />
    </>
  );
}

const nodeTypes = { findingsNode: FindingsFlowNode };
const edgeTypes = { findingsEdge: FindingsFlowEdge };

function MapSync({
  findings,
  highlightFindingId,
  positions,
  onGraphReady,
}: {
  findings: Finding[];
  highlightFindingId?: string | null;
  positions: FindingsMapPositions;
  onGraphReady: (nodes: MapNode[], edges: MapEdge[], hadNewNodes: boolean) => void;
}) {
  const { fitView } = useReactFlow();
  const prevIdsRef = React.useRef<string>("");

  React.useEffect(() => {
    const graph = buildFindingsMapGraph(findings, positions, { highlightFindingId });
    const signature = graph.nodes.map((node) => node.id).sort().join("|");
    const hadNewNodes = prevIdsRef.current !== "" && signature !== prevIdsRef.current;
    prevIdsRef.current = signature;
    onGraphReady(graph.nodes, graph.edges, hadNewNodes);
    if (hadNewNodes || highlightFindingId) {
      window.requestAnimationFrame(() => {
        void fitView({ padding: 0.22, duration: 420 });
      });
    }
  }, [findings, fitView, highlightFindingId, onGraphReady, positions]);

  return null;
}

function FindingsMapCanvas({
  findings,
  highlightFindingId,
  onSelectFinding,
}: {
  findings: Finding[];
  highlightFindingId?: string | null;
  onSelectFinding?: (findingId: string) => void;
}) {
  const [hydrated, setHydrated] = React.useState(false);
  const [savedPositions, setSavedPositions] = React.useState<FindingsMapPositions>({});
  const livePositionsRef = React.useRef<FindingsMapPositions>({});
  const [nodes, setNodes, onNodesChangeBase] = useNodesState<MapNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<MapEdge>([]);

  const positions = React.useMemo(
    () => mergePositions(savedPositions, livePositionsRef.current),
    [savedPositions, findings, highlightFindingId],
  );

  React.useEffect(() => {
    const document = parseFindingsMap(window.localStorage.getItem(FINDINGS_MAP_STORAGE_KEY));
    setSavedPositions(document.positions);
    livePositionsRef.current = document.positions;
    setHydrated(true);
  }, []);

  const onGraphReady = React.useCallback(
    (nextNodes: MapNode[], nextEdges: MapEdge[], _hadNewNodes: boolean) => {
      setNodes(nextNodes);
      setEdges(nextEdges);
    },
    [setEdges, setNodes],
  );

  function persistPositions(nextNodes: MapNode[]) {
    const next = positionsFromNodes(nextNodes);
    livePositionsRef.current = next;
    window.localStorage.setItem(
      FINDINGS_MAP_STORAGE_KEY,
      serializeFindingsMap({ positions: next, updatedAt: new Date().toISOString() }),
    );
  }

  function onNodesChange(changes: NodeChange<MapNode>[]) {
    onNodesChangeBase(changes);
    const finishedDrag = changes.some((change) => change.type === "position" && change.dragging === false);
    if (!finishedDrag) return;
    window.requestAnimationFrame(() => {
      setNodes((current) => {
        persistPositions(current);
        return current;
      });
    });
  }

  function resetLayout() {
    window.localStorage.removeItem(FINDINGS_MAP_STORAGE_KEY);
    livePositionsRef.current = {};
    setSavedPositions({});
  }

  const targetCount = React.useMemo(() => {
    return new Set(findings.map((item) => findingTargetKey(item))).size;
  }, [findings]);

  return (
    <div
      aria-label="Findings map"
      className="findings-map-shell overflow-hidden rounded-2xl border border-white/[.08] bg-[#07080c] shadow-[0_24px_80px_rgba(0,0,0,.45)]"
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/[.06] bg-[radial-gradient(120%_80%_at_0%_0%,rgba(139,108,255,.12),transparent_55%)] px-4 py-3">
        <div>
          <p className="font-sans text-[11px] uppercase tracking-[.14em] text-violet-300/85">Target map</p>
          <p className="mt-1 font-sans text-[12px] text-zinc-500">
            Mindmap of notes → hosts · live updates as you capture · drag to rearrange
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
      <div className="findings-map-flow relative h-[620px] w-full">
        {!hydrated ? (
          <div className="grid h-full place-items-center font-sans text-sm text-zinc-600">Loading map…</div>
        ) : findings.length === 0 ? (
          <div className="grid h-full place-items-center px-6 text-center">
            <div>
              <p className="font-sans text-sm text-zinc-400">Canvas is empty</p>
              <p className="mt-2 font-sans text-[12px] text-zinc-600">
                Save a finding above — it will appear here under its target.
              </p>
            </div>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            fitViewOptions={{ padding: 0.22 }}
            minZoom={0.28}
            maxZoom={1.75}
            proOptions={{ hideAttribution: true }}
            nodesConnectable={false}
            elementsSelectable
            panOnScroll
            zoomOnDoubleClick={false}
            onNodeClick={(_, node) => {
              if (node.data.findingId) onSelectFinding?.(node.data.findingId);
            }}
            colorMode="dark"
            defaultEdgeOptions={{ type: "findingsEdge" }}
          >
            <MapSync
              findings={findings}
              highlightFindingId={highlightFindingId}
              positions={positions}
              onGraphReady={onGraphReady}
            />
            <Background
              id="findings-dots"
              variant={BackgroundVariant.Dots}
              gap={18}
              size={1.1}
              color="rgba(167,139,250,0.08)"
            />
            <Background
              id="findings-lines"
              variant={BackgroundVariant.Lines}
              gap={72}
              color="rgba(255,255,255,0.02)"
            />
            <Controls
              showInteractive={false}
              className="!border-white/10 !bg-[#111218]/95 !shadow-none [&>button]:!border-white/10 [&>button]:!bg-[#111218] [&>button]:!fill-zinc-300"
            />
            <MiniMap
              pannable
              zoomable
              className="!border-white/10 !bg-[#0b0c12]/95"
              maskColor="rgba(7,8,12,.72)"
              nodeColor={(node) => {
                const kind = (node.data as FindingsMapNodeData | undefined)?.kind;
                if (kind === "root") return "#8b6cff";
                if (kind === "target") return "#60a5fa";
                return "#52525b";
              }}
            />
            <Panel
              position="top-left"
              className="rounded-xl border border-white/[.08] bg-[#0d0e14]/88 px-3 py-2 font-sans text-[11px] text-zinc-400 backdrop-blur-md"
            >
              <span className="text-zinc-200">{findings.length}</span> notes ·{" "}
              <span className="text-zinc-200">{targetCount}</span> targets
              {highlightFindingId ? (
                <span className="ml-2 text-violet-300">· live update</span>
              ) : null}
            </Panel>
            <svg className="pointer-events-none absolute">
              <defs>
                <linearGradient id="findings-edge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ae53ba" />
                  <stop offset="100%" stopColor="#2a8af6" />
                </linearGradient>
                <marker
                  id="findings-edge-circle"
                  viewBox="-5 -5 10 10"
                  refX="0"
                  refY="0"
                  markerUnits="strokeWidth"
                  markerWidth="10"
                  markerHeight="10"
                  orient="auto"
                >
                  <circle stroke="#2a8af6" strokeOpacity="0.85" r="2" cx="0" cy="0" fill="none" />
                </marker>
              </defs>
            </svg>
          </ReactFlow>
        )}
      </div>
    </div>
  );
}

export function FindingsMap({
  findings,
  highlightFindingId,
  onSelectFinding,
}: {
  findings: Finding[];
  highlightFindingId?: string | null;
  onSelectFinding?: (findingId: string) => void;
}) {
  return (
    <ReactFlowProvider>
      <FindingsMapCanvas
        findings={findings}
        highlightFindingId={highlightFindingId}
        onSelectFinding={onSelectFinding}
      />
    </ReactFlowProvider>
  );
}
