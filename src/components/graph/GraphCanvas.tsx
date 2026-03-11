"use client";

import { useCallback, useEffect, useMemo } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type NodeTypes,
  type EdgeTypes,
  type Node,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { ADNode } from "./ADNode";
import { AttackEdge } from "./AttackEdge";
import { useGraphStore } from "@/lib/store/graph-store";
import { useChatStore } from "@/lib/store/chat-store";
import { useInfoPanelStore } from "@/lib/store/info-panel-store";
import type { ADNodeData, ADEdgeData } from "@/types";

const nodeTypes: NodeTypes = {
  adNode: ADNode,
};

const edgeTypes: EdgeTypes = {
  attackEdge: AttackEdge,
};

function GraphCanvasInner() {
  const { nodes: storeNodes, edges: storeEdges, selectNode, fitViewTrigger } = useGraphStore();
  const { addContextChip } = useChatStore();
  const { setSelectedEntity, setSelectedEdge } = useInfoPanelStore();
  const { fitView } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState(storeNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(storeEdges);

  // Sync store → local state
  useMemo(() => {
    setNodes(storeNodes);
    setEdges(storeEdges);
  }, [storeNodes, storeEdges, setNodes, setEdges]);

  // Respond to fitView requests from explore panel
  useEffect(() => {
    if (fitViewTrigger > 0) {
      setTimeout(() => fitView({ padding: 0.2, duration: 400 }), 100);
    }
  }, [fitViewTrigger, fitView]);

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const data = node.data as ADNodeData;
      selectNode(data.objectId);
      addContextChip({
        objectId: data.objectId,
        label: data.label,
        kind: data.kind,
      });
      setSelectedEntity({
        objectId: data.objectId,
        kind: data.kind,
        label: data.label,
      });
    },
    [selectNode, addContextChip, setSelectedEntity]
  );

  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: { id: string; source: string; target: string; data?: unknown }) => {
      const edgeData = edge.data as ADEdgeData | undefined;
      const sourceNode = storeNodes.find((n) => n.id === edge.source);
      const targetNode = storeNodes.find((n) => n.id === edge.target);
      const sourceData = sourceNode?.data as ADNodeData | undefined;
      const targetData = targetNode?.data as ADNodeData | undefined;

      setSelectedEdge({
        sourceId: sourceData?.objectId ?? edge.source,
        targetId: targetData?.objectId ?? edge.target,
        kind: edgeData?.label ?? "Unknown",
        sourceLabel: sourceData?.label ?? edge.source,
        targetLabel: targetData?.label ?? edge.target,
      });
    },
    [storeNodes, setSelectedEdge]
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  return (
    <div className="w-full h-full bg-zinc-950">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: "attackEdge",
          animated: false,
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#27272a" />
        <Controls
          className="!bg-zinc-800 !border-zinc-700 !rounded-lg [&>button]:!bg-zinc-800 [&>button]:!border-zinc-700 [&>button]:!fill-zinc-400 [&>button:hover]:!bg-zinc-700"
        />
        <MiniMap
          className="!bg-zinc-900 !border-zinc-700 !rounded-lg"
          nodeColor="#3f3f46"
          maskColor="rgba(0, 0, 0, 0.7)"
        />
      </ReactFlow>
    </div>
  );
}

export function GraphCanvas() {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner />
    </ReactFlowProvider>
  );
}
