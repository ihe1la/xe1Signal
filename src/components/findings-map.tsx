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
        "findings-map-node group relative min-w-[190px] max-w-[260px]",
        data.kind === "root" && "findings-map-node--root",
        data.kind === "target" && "findings-map-node--target",
        data.kind === "note" && "findings-map-node--note",
        data.fresh && "findings-map-node--fresh",
        selected && "is-selected",
      )}
    >
      <Handle type="target" position={Position.Left} className="findings-map-handle" />
      <div className="flex items-start gap-3">
        <span className="findings-map-node__icon grid h-8 w-8 shrink-0 place-items-center rounded-lg">
          <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="font-sans text-[10px] uppercase tracking-[0.16em] text-zinc-400">
            {data.kind === "root" ? "Root" : data.kind === "target" ? "Target" : "Note"}
          </p>
          <p className="mt-1.5 font-sans text-[13px] font-semibold leading-5 tracking-tight text-white">
            {data.label}
          </p>
          {data.detail ? (
            <p className="mt-1.5 truncate font-mono text-[11px] text-zinc-400">{data.detail}</p>
          ) : null}
          {data.kind === "note" && data.tags && data.tags.length > 0 ? (
            <div className="mt-2.5 flex flex-wrap gap-1">
              {data.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="rounded-md border border-white/15 bg-white/[.06] px-1.5 py-0.5 font-sans text-[10px] text-zinc-300"
                >
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        {typeof data.noteCount === "number" && data.kind !== "note" ? (
          <span className="rounded-md border border-white/15 bg-white/[.06] px-1.5 py-0.5 font-mono text-[11px] text-zinc-300">
            {data.noteCount}
          </span>
        ) : null}
      </div>
      <Handle type="source" position={Position.Right} className="findings-map-handle" />
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
          stroke: spine ? "rgba(228,228,231,0.72)" : "rgba(161,161,170,0.55)",
          strokeWidth: spine ? 2.25 : 1.75,
        }}
      />
      {spine ? (
        <path
          d={edgePath}
          fill="none"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth={2.25}
          strokeDasharray="4 10"
          className="findings-edge-dash"
        />
      ) : null}
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
    const signature = graph.nodes
      .map((node) => node.id)
      .sort()
      .join("|");
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
      className="findings-map-shell overflow-hidden rounded-2xl border border-white/20 bg-black"
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/15 bg-[#0a0a0a] px-4 py-3">
        <div>
          <p className="font-sans text-[11px] uppercase tracking-[.16em] text-zinc-300">Target map</p>
          <p className="mt-1 font-sans text-[12px] text-zinc-500">
            Notes → hosts · updates live · drag to rearrange
          </p>
        </div>
        <button
          type="button"
          onClick={resetLayout}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/20 bg-white/[.04] px-3 font-sans text-[11px] text-zinc-300 transition hover:border-white/35 hover:bg-white/[.08] hover:text-white"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset layout
        </button>
      </div>
      <div className="findings-map-flow relative h-[620px] w-full bg-black">
        {!hydrated ? (
          <div className="grid h-full place-items-center bg-black font-sans text-sm text-zinc-400">
            Loading map…
          </div>
        ) : findings.length === 0 ? (
          <div className="grid h-full place-items-center bg-black px-6 text-center">
            <div>
              <p className="font-sans text-sm text-zinc-300">Canvas is empty</p>
              <p className="mt-2 font-sans text-[12px] text-zinc-500">
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
            style={{ background: "#000000" }}
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
              gap={20}
              size={1.35}
              color="rgba(255,255,255,0.16)"
              bgColor="#000000"
            />
            <Controls
              showInteractive={false}
              className="!m-3 !overflow-hidden !rounded-xl !border !border-white/25 !bg-[#141414] !shadow-none [&>button]:!h-8 [&>button]:!w-8 [&>button]:!border-white/15 [&>button]:!bg-[#141414] [&>button]:!fill-zinc-200"
            />
            <MiniMap
              pannable
              zoomable
              className="!m-3 !overflow-hidden !rounded-xl !border !border-white/25 !bg-[#0a0a0a]"
              maskColor="rgba(0,0,0,.55)"
              nodeStrokeColor="#ffffff"
              nodeStrokeWidth={2}
              nodeColor={(node) => {
                const kind = (node.data as FindingsMapNodeData | undefined)?.kind;
                if (kind === "root") return "#fafafa";
                if (kind === "target") return "#d4d4d8";
                return "#71717a";
              }}
            />
            <Panel
              position="top-left"
              className="rounded-xl border border-white/20 bg-[#121212]/95 px-3 py-2 font-sans text-[11px] text-zinc-400 shadow-lg shadow-black/40"
            >
              <span className="text-zinc-100">{findings.length}</span> notes ·{" "}
              <span className="text-zinc-100">{targetCount}</span> targets
              {highlightFindingId ? <span className="ml-2 text-zinc-300">· live</span> : null}
            </Panel>
            <svg className="pointer-events-none absolute">
              <defs>
                <marker
                  id="findings-edge-circle"
                  viewBox="-5 -5 10 10"
                  refX="0"
                  refY="0"
                  markerUnits="strokeWidth"
                  markerWidth="9"
                  markerHeight="9"
                  orient="auto"
                >
                  <circle stroke="#e4e4e7" strokeOpacity="0.9" r="2.2" cx="0" cy="0" fill="#000" />
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
