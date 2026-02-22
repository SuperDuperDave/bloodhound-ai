import { create } from "zustand";
import type { Node, Edge } from "@xyflow/react";
import type { ADNodeData, ADEdgeData } from "@/types";

interface GraphState {
  nodes: Node<ADNodeData>[];
  edges: Edge<ADEdgeData>[];
  highlightedNodeIds: Set<string>;
  highlightedEdgeIds: Set<string>;
  selectedNodeId: string | null;

  setGraph: (nodes: Node<ADNodeData>[], edges: Edge<ADEdgeData>[]) => void;
  addGraph: (nodes: Node<ADNodeData>[], edges: Edge<ADEdgeData>[]) => void;
  selectNode: (nodeId: string | null) => void;
  highlightNodes: (nodeIds: string[]) => void;
  highlightEdges: (edgeIds: string[]) => void;
  clearHighlights: () => void;
  updateNodes: (updater: (nodes: Node<ADNodeData>[]) => Node<ADNodeData>[]) => void;
  updateEdges: (updater: (edges: Edge<ADEdgeData>[]) => Edge<ADEdgeData>[]) => void;
}

export const useGraphStore = create<GraphState>((set) => ({
  nodes: [],
  edges: [],
  highlightedNodeIds: new Set(),
  highlightedEdgeIds: new Set(),
  selectedNodeId: null,

  setGraph: (nodes, edges) =>
    set({ nodes, edges, highlightedNodeIds: new Set(), highlightedEdgeIds: new Set() }),

  addGraph: (newNodes, newEdges) =>
    set((state) => {
      const existingNodeIds = new Set(state.nodes.map((n) => n.id));
      const existingEdgeIds = new Set(state.edges.map((e) => e.id));

      const uniqueNodes = newNodes.filter((n) => !existingNodeIds.has(n.id));
      const uniqueEdges = newEdges.filter((e) => !existingEdgeIds.has(e.id));

      return {
        nodes: [...state.nodes, ...uniqueNodes],
        edges: [...state.edges, ...uniqueEdges],
      };
    }),

  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

  highlightNodes: (nodeIds) =>
    set({ highlightedNodeIds: new Set(nodeIds) }),

  highlightEdges: (edgeIds) =>
    set({ highlightedEdgeIds: new Set(edgeIds) }),

  clearHighlights: () =>
    set({ highlightedNodeIds: new Set(), highlightedEdgeIds: new Set() }),

  updateNodes: (updater) =>
    set((state) => ({ nodes: updater(state.nodes) })),

  updateEdges: (updater) =>
    set((state) => ({ edges: updater(state.edges) })),
}));
