import dagre from "@dagrejs/dagre";
import type { Node, Edge } from "@xyflow/react";
import type { ADNodeData, ADEdgeData, ADNodeKind } from "@/types";

interface BHGraphData {
  nodes: Record<
    string,
    {
      label: string;
      kind: string;
      objectId: string;
      isTierZero: boolean;
      properties?: Record<string, unknown>;
    }
  >;
  edges: {
    source: string;
    target: string;
    label: string;
    kind: string;
  }[];
}

const NODE_WIDTH = 200;
const NODE_HEIGHT = 80;

export function transformBHGraph(
  bhData: BHGraphData,
  existingNodes?: Node<ADNodeData>[],
  existingEdges?: Edge<ADEdgeData>[]
): { nodes: Node<ADNodeData>[]; edges: Edge<ADEdgeData>[] } {
  // Merge with existing if provided
  const nodeMap = new Map<string, Node<ADNodeData>>();
  const edgeMap = new Map<string, Edge<ADEdgeData>>();

  // Add existing first
  if (existingNodes) {
    for (const n of existingNodes) {
      nodeMap.set(n.id, n);
    }
  }
  if (existingEdges) {
    for (const e of existingEdges) {
      edgeMap.set(e.id, e);
    }
  }

  // Transform BH nodes
  for (const [graphId, node] of Object.entries(bhData.nodes)) {
    const id = node.objectId || graphId;
    if (!nodeMap.has(id)) {
      nodeMap.set(id, {
        id,
        type: "adNode",
        position: { x: 0, y: 0 },
        data: {
          id,
          objectId: node.objectId || graphId,
          label: node.label,
          kind: mapKind(node.kind),
          domain: (node.properties?.domain as string) || "",
          properties: node.properties,
          isHighlighted: false,
          isSelected: false,
        },
      });
    }
  }

  // Build objectId lookup for edge resolution
  const graphIdToObjectId = new Map<string, string>();
  for (const [graphId, node] of Object.entries(bhData.nodes)) {
    graphIdToObjectId.set(graphId, node.objectId || graphId);
  }

  // Transform BH edges
  for (const edge of bhData.edges) {
    const sourceId = graphIdToObjectId.get(edge.source) || edge.source;
    const targetId = graphIdToObjectId.get(edge.target) || edge.target;
    const edgeId = `${sourceId}-${edge.kind}-${targetId}`;

    if (!edgeMap.has(edgeId)) {
      edgeMap.set(edgeId, {
        id: edgeId,
        source: sourceId,
        target: targetId,
        type: "attackEdge",
        label: edge.label,
        data: {
          id: edgeId,
          source: sourceId,
          target: targetId,
          label: edge.label,
          isHighlighted: false,
        },
      });
    }
  }

  const nodes = Array.from(nodeMap.values());
  const edges = Array.from(edgeMap.values());

  // Apply dagre layout
  return applyDagreLayout(nodes, edges);
}

function applyDagreLayout(
  nodes: Node<ADNodeData>[],
  edges: Edge<ADEdgeData>[]
): { nodes: Node<ADNodeData>[]; edges: Edge<ADEdgeData>[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 60, ranksep: 120, marginx: 40, marginy: 40 });

  for (const node of nodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }

  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  const layoutNodes = nodes.map((node) => {
    const pos = g.node(node.id);
    if (pos) {
      return {
        ...node,
        position: {
          x: pos.x - NODE_WIDTH / 2,
          y: pos.y - NODE_HEIGHT / 2,
        },
      };
    }
    return node;
  });

  return { nodes: layoutNodes, edges };
}

function mapKind(kind: string): ADNodeKind {
  const kindMap: Record<string, ADNodeKind> = {
    User: "User",
    Computer: "Computer",
    Group: "Group",
    Domain: "Domain",
    OU: "OU",
    GPO: "GPO",
    Container: "Container",
    AIACA: "AIACA",
    RootCA: "RootCA",
    EnterpriseCA: "EnterpriseCA",
    NTAuthStore: "NTAuthStore",
    CertTemplate: "CertTemplate",
  };
  return kindMap[kind] || "Container";
}
