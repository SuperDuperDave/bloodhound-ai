import { tool, type ToolSet } from "ai";
import { z } from "zod";
import { searchNodes, getNodeByObjectId, runCypher, getDomains } from "@/lib/bloodhound/client";
import { transformBHGraph } from "@/lib/bloodhound/transform";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const defineTool = tool as any;

export const serverTools: ToolSet = {
  search_nodes: defineTool({
    description:
      "Search the BloodHound database for Active Directory objects (users, computers, groups, domains, OUs, GPOs) by name. Returns matching objects with their type and objectId.",
    parameters: z.object({
      query: z.string().describe("Search query — name or partial name of the AD object"),
      limit: z.number().optional().default(10).describe("Max results to return"),
    }),
    execute: async ({ query, limit }: { query: string; limit: number }) => {
      const results = await searchNodes(query, limit);
      return {
        results: results.map((r) => ({
          name: r.name,
          type: r.type,
          objectId: r.objectid,
          distinguishedName: r.distinguishedname,
        })),
        count: results.length,
      };
    },
  }),

  get_node_details: defineTool({
    description:
      "Get detailed information about a specific AD object by its objectId. Returns all properties including group memberships, SPNs, delegation settings, etc.",
    parameters: z.object({
      objectId: z.string().describe("The objectId (SID or GUID) of the AD object"),
    }),
    execute: async ({ objectId }: { objectId: string }) => {
      const node = await getNodeByObjectId(objectId);
      return {
        kind: node.kind,
        properties: node.props,
      };
    },
  }),

  find_attack_paths: defineTool({
    description:
      "Find the shortest attack path between two AD objects. Use objectIds for both start and end nodes. Returns the path as nodes and edges for visualization.",
    parameters: z.object({
      startObjectId: z.string().describe("ObjectId of the starting node (attacker position)"),
      endObjectId: z.string().describe("ObjectId of the target node (objective)"),
    }),
    execute: async ({ startObjectId, endObjectId }: { startObjectId: string; endObjectId: string }) => {
      const query = `MATCH p=shortestPath((s)-[*1..]->(e)) WHERE s.objectid = "${startObjectId}" AND e.objectid = "${endObjectId}" RETURN p`;
      const data = await runCypher(query);
      const graphData = data as unknown as {
        nodes: Record<string, { label: string; kind: string; objectId: string; isTierZero: boolean; properties?: Record<string, unknown> }>;
        edges: { source: string; target: string; label: string; kind: string }[];
      };

      if (!graphData.nodes || Object.keys(graphData.nodes).length === 0) {
        return { found: false, message: "No path found between these objects." };
      }

      const { nodes, edges } = transformBHGraph(graphData);
      return {
        found: true,
        pathLength: edges.length,
        nodes: nodes.map((n) => ({
          id: n.data.objectId,
          label: n.data.label,
          kind: n.data.kind,
        })),
        edges: edges.map((e) => ({
          source: e.source,
          target: e.target,
          label: e.data?.label || e.label,
        })),
        nodeIds: nodes.map((n) => n.data.objectId),
        edgeIds: edges.map((e) => e.id),
        graphData: { nodes, edges },
      };
    },
  }),

  run_cypher_query: defineTool({
    description:
      "Execute a Cypher query against the BloodHound graph database. Use for complex analysis like finding kerberoastable users, unconstrained delegation, specific attack patterns, etc. Returns graph data (nodes/edges) and/or literal values.",
    parameters: z.object({
      query: z.string().describe("Cypher query to execute"),
      description: z.string().describe("Brief description of what this query does — shown to the user"),
    }),
    execute: async ({ query }: { query: string }) => {
      const data = await runCypher(query);
      const graphData = data as unknown as {
        nodes?: Record<string, { label: string; kind: string; objectId: string; isTierZero: boolean; properties?: Record<string, unknown> }>;
        edges?: { source: string; target: string; label: string; kind: string }[];
        literals?: { key: string; value: unknown }[];
      };

      const result: {
        hasGraph: boolean;
        nodes?: { id: string; label: string; kind: string }[];
        edges?: { source: string; target: string; label: string }[];
        literals?: { key: string; value: unknown }[];
        graphData?: ReturnType<typeof transformBHGraph>;
      } = { hasGraph: false };

      if (graphData.nodes && Object.keys(graphData.nodes).length > 0) {
        const transformed = transformBHGraph({
          nodes: graphData.nodes,
          edges: graphData.edges || [],
        });
        result.hasGraph = true;
        result.nodes = transformed.nodes.map((n) => ({
          id: n.data.objectId,
          label: n.data.label,
          kind: n.data.kind,
        }));
        result.edges = transformed.edges.map((e) => ({
          source: e.source,
          target: e.target,
          label: e.data?.label || (e.label as string) || "",
        }));
        result.graphData = transformed;
      }

      if (graphData.literals && graphData.literals.length > 0) {
        result.literals = graphData.literals;
      }

      return result;
    },
  }),

  get_domain_info: defineTool({
    description: "Get information about all domains in the BloodHound database, including collection status and domain SIDs.",
    parameters: z.object({}),
    execute: async () => {
      const domains = await getDomains();
      return {
        domains: domains.map((d) => ({
          name: d.name,
          id: d.id,
          type: d.type,
          collected: d.collected,
        })),
        totalDomains: domains.length,
        collectedDomains: domains.filter((d) => d.collected).length,
      };
    },
  }),
};

// Client-side tools — no execute function, handled by onToolCall in ChatPanel
export const clientTools: ToolSet = {
  highlight_graph_elements: defineTool({
    description:
      "Highlight specific nodes and/or edges on the graph canvas to draw attention to attack paths, vulnerable objects, or important relationships. Nodes get a red highlight ring, edges get animated.",
    parameters: z.object({
      nodeIds: z
        .array(z.string())
        .optional()
        .describe("Array of objectIds to highlight on the canvas"),
      edgeIds: z
        .array(z.string())
        .optional()
        .describe("Array of edge IDs to highlight (format: sourceId-kind-targetId)"),
      clear: z
        .boolean()
        .optional()
        .default(false)
        .describe("Clear all existing highlights first"),
    }),
  }),

  add_remediation_item: defineTool({
    description:
      "Add a security finding and its remediation to the remediation plan. Use after identifying a vulnerability or risky configuration.",
    parameters: z.object({
      title: z.string().describe("Short title for the finding"),
      severity: z
        .enum(["critical", "high", "medium", "low"])
        .describe("Severity level of the finding"),
      description: z.string().describe("Technical description of the vulnerability"),
      recommendation: z.string().describe("Specific remediation steps"),
      affectedObjects: z
        .array(z.string())
        .optional()
        .describe("Names of affected AD objects"),
    }),
  }),
};

export const allTools: ToolSet = { ...serverTools, ...clientTools };
