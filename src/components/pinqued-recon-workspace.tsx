"use client";

import * as React from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { ChevronRight, Plus, RotateCcw } from "lucide-react";

type ReconNodeKind = "input" | "archive" | "extract" | "control" | "output";

type ReconNodeData = {
  label: string;
  detail?: string;
  kind: ReconNodeKind;
  marker?: boolean;
};

type ReconNode = Node<ReconNodeData>;

const initialNodes: ReconNode[] = [
  {
    id: "url-pattern",
    type: "recon",
    position: { x: 74, y: 300 },
    data: { label: "URL", detail: "*.planthat.com", kind: "input" },
  },
  {
    id: "unique-urls",
    type: "recon",
    position: { x: 392, y: 430 },
    data: { label: "Unique URLs in Snapshots", kind: "output" },
  },
  {
    id: "gap-params",
    type: "recon",
    position: { x: 282, y: 116 },
    data: { label: "GAP Params", kind: "extract", marker: true },
  },
  {
    id: "target-url",
    type: "recon",
    position: { x: 654, y: 300 },
    data: { label: "URL", detail: "he1l.me", kind: "input" },
  },
  {
    id: "unique-snapshots",
    type: "recon",
    position: { x: 982, y: 300 },
    data: { label: "Unique Snapshots", kind: "archive" },
  },
];

const initialEdges = [
  {
    id: "url-to-unique",
    source: "url-pattern",
    target: "unique-urls",
    type: "bezier",
    style: { stroke: "#36363f", strokeWidth: 1.25 },
  },
  {
    id: "target-to-snapshots",
    source: "target-url",
    target: "unique-snapshots",
    type: "bezier",
    style: { stroke: "#36363f", strokeWidth: 1.25 },
  },
];

function ReconFlowNode({ data }: NodeProps<ReconNode>) {
  return (
    <div className="relative w-[216px] border border-[#27272f] bg-[#15151a] text-[#e6e2eb] shadow-[0_12px_30px_rgba(0,0,0,.22)]">
      {data.marker ? (
        <span className="absolute -top-2 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full border border-[#101014] bg-[#ff8a00] shadow-[0_0_0_1px_#ff8a00]" />
      ) : null}
      <Handle
        type="target"
        position={Position.Left}
        className="!h-1.5 !w-1.5 !border-0 !bg-[#65616c]"
      />
      <div className="flex h-9 items-center justify-between border-b border-[#27272f] px-3 font-mono text-[10px] text-[#e9e3ef]">
        <span>{data.label}</span>
        {data.kind !== "input" ? <ChevronRight className="h-3.5 w-3.5 text-[#ece6f3]" /> : <ChevronRight className="h-3.5 w-3.5 text-[#ece6f3]" />}
      </div>
      {data.detail ? (
        <div className="px-3 py-2 font-mono text-[12px] text-[#f2edf6]">{data.detail}</div>
      ) : null}
      <Handle
        type="source"
        position={Position.Right}
        className="!h-1.5 !w-1.5 !border-0 !bg-[#65616c]"
      />
    </div>
  );
}

const nodeTypes = { recon: ReconFlowNode };

function PaletteButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-11 w-full items-center justify-center border border-[#292830] bg-[#17171c] px-3 text-center font-mono text-[12px] text-[#e8e2ee] transition hover:border-[#55505f] hover:bg-[#1d1c23]"
    >
      {children}
    </button>
  );
}

function ReconCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState<ReconNode>(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);
  const { fitView } = useReactFlow();

  function addNode(label: string, kind: ReconNodeKind) {
    const index = nodes.length - initialNodes.length;
    setNodes((current) => [
      ...current,
      {
        id: `recon-${Date.now()}`,
        type: "recon",
        position: { x: 110 + (index % 3) * 270, y: 92 + Math.floor(index / 3) * 150 },
        data: { label, kind },
      },
    ]);
  }

  function resetCanvas() {
    setNodes(initialNodes);
    window.requestAnimationFrame(() => void fitView({ padding: 0.18, duration: 260 }));
  }

  return (
    <div className="grid min-h-[700px] grid-cols-[238px_minmax(0,1fr)] bg-[#09090c]">
      <aside className="border-r border-[#292830] bg-[#101014] px-3 py-5">
        <div className="mb-7 border border-[#2c2b33] bg-[#18171d] px-3 py-3 text-center font-mono text-[12px] text-[#e9e2f0]">
          Flows
        </div>
        <div className="space-y-6">
          <div>
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[.16em] text-[#9a93a8]">Inputs</p>
            <PaletteButton onClick={() => addNode("Input Node", "input")}>Input Node</PaletteButton>
          </div>
          <div>
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[.16em] text-[#9a93a8]">Archive</p>
            <div className="space-y-1">
              <PaletteButton onClick={() => addNode("Wayback CDX Search", "archive")}>Wayback CDX Search</PaletteButton>
              <PaletteButton onClick={() => addNode("Wayback Snapshot Fetch", "archive")}>Wayback Snapshot Fetch</PaletteButton>
            </div>
          </div>
          <div>
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[.16em] text-[#9a93a8]">Extraction</p>
            <PaletteButton onClick={() => addNode("GAP (Get All Params)", "extract")}>GAP (Get All Params)</PaletteButton>
          </div>
          <div>
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[.16em] text-[#9a93a8]">Controls</p>
            <PaletteButton onClick={() => addNode("Limit", "control")}>Limit</PaletteButton>
          </div>
        </div>
      </aside>

      <section className="relative min-w-0 bg-[#08080b]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.18 }}
          minZoom={0.35}
          maxZoom={1.7}
          nodesConnectable
          elementsSelectable
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{ type: "bezier" }}
          colorMode="dark"
          style={{ background: "#08080b" }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={27}
            size={1.1}
            color="#24242b"
            bgColor="#08080b"
          />
          <Controls
            showInteractive={false}
            className="!bottom-4 !left-4 !m-0 !overflow-hidden !rounded-none !border !border-[#303039] !bg-[#16161b] !shadow-none [&>button]:!h-8 [&>button]:!w-8 [&>button]:!border-b-[#303039] [&>button]:!bg-[#16161b] [&>button]:!fill-[#d9d3df] [&>button]:!text-[#d9d3df]"
          />
          <div className="pointer-events-none absolute inset-x-4 bottom-4 z-10 flex justify-end">
            <div className="pointer-events-auto flex items-center gap-4 border border-[#303039] bg-[#16161b] px-3 py-2 font-mono text-[10px] text-[#dcd5e2]">
              <span className="text-emerald-300">OK</span><span className="h-px w-14 bg-[#45434d]" />
              <span className="text-emerald-300">OK</span><span className="h-px w-14 bg-[#45434d]" />
              <span className="text-emerald-300">OK</span>
              <button type="button" aria-label="Add flow node" onClick={() => addNode("Input Node", "input")} className="text-lg leading-none text-[#e8e2ee] hover:text-white">+</button>
              <button type="button" aria-label="Reset recon canvas" onClick={resetCanvas} className="text-[#a9a2b0] hover:text-white"><RotateCcw className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        </ReactFlow>
      </section>
    </div>
  );
}

export function PinquedReconWorkspace() {
  return (
    <section aria-label="Recon flow workspace" className="overflow-hidden border border-[#292830] bg-[#09090c]">
      <ReactFlowProvider>
        <ReconCanvas />
      </ReactFlowProvider>
      <div className="flex items-center justify-between border-t border-[#292830] bg-[#101014] px-4 py-2 font-mono text-[9px] uppercase tracking-[.14em] text-[#777181]">
        <span>Recon flow · local canvas</span>
        <span className="inline-flex items-center gap-1.5"><Plus className="h-3 w-3" /> add nodes from the palette</span>
      </div>
    </section>
  );
}
