import { tool, type ToolSet } from "ai";
import { z } from "zod";
import { searchNodes, getNodeByObjectId, runCypher, getDomains } from "@/lib/bloodhound/client";
import { transformBHGraph } from "@/lib/bloodhound/transform";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const defineTool = tool as any;

// Helper: extract graph data from Cypher response and transform for canvas
function transformCypherGraph(data: unknown) {
  const graphData = data as {
    nodes?: Record<string, { label: string; kind: string; objectId: string; isTierZero: boolean; properties?: Record<string, unknown> }>;
    edges?: { source: string; target: string; label: string; kind: string }[];
    literals?: { key: string; value: unknown }[];
  };

  let graph = null;
  if (graphData.nodes && Object.keys(graphData.nodes).length > 0) {
    const transformed = transformBHGraph({
      nodes: graphData.nodes,
      edges: graphData.edges || [],
    });
    graph = {
      nodes: transformed.nodes.map((n) => ({
        id: n.data.objectId,
        label: n.data.label,
        kind: n.data.kind,
        isTierZero: n.data.properties?.system_tags?.toString().includes("admin_tier_0") || false,
      })),
      edges: transformed.edges.map((e) => ({
        source: e.source,
        target: e.target,
        label: e.data?.label || (e.label as string) || "",
      })),
      nodeIds: transformed.nodes.map((n) => n.data.objectId),
      edgeIds: transformed.edges.map((e) => e.id),
      graphData: transformed,
    };
  }

  return { graph, literals: graphData.literals || [] };
}

// Helper: extract literal values grouped by row from Cypher results
function extractLiteralRows(literals: { key: string; value: unknown }[]): Record<string, unknown>[] {
  if (literals.length === 0) return [];
  // BH returns literals as flat key/value pairs — group by position
  const keys = [...new Set(literals.map((l) => l.key))];
  const rowCount = literals.filter((l) => l.key === keys[0]).length;
  const rows: Record<string, unknown>[] = [];
  for (let i = 0; i < rowCount; i++) {
    const row: Record<string, unknown> = {};
    for (const key of keys) {
      const vals = literals.filter((l) => l.key === key);
      row[key] = vals[i]?.value;
    }
    rows.push(row);
  }
  return rows;
}

// ═══════════════════════════════════════════════════════════
// CORE TOOLS — Search, Details, Pathfinding, Domains
// ═══════════════════════════════════════════════════════════

export const coreTools: ToolSet = {
  search_nodes: defineTool({
    description:
      "Search the BloodHound database for Active Directory objects (users, computers, groups, domains, OUs, GPOs) by name. Returns matching objects with their type and objectId. Use this as the first step to identify objects before deeper analysis.",
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
      "Get detailed properties of a specific AD object by its objectId. Returns all properties including group memberships, SPNs, delegation settings, enabled status, admin count, tier zero status, etc. Use after search_nodes to inspect a specific object.",
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
      "Find the shortest attack path between two specific AD objects. Requires objectIds for both start and end nodes (use search_nodes first to find objectIds). Returns the path as nodes and edges for visualization on the canvas.",
    parameters: z.object({
      startObjectId: z.string().describe("ObjectId of the starting node (attacker position)"),
      endObjectId: z.string().describe("ObjectId of the target node (objective)"),
    }),
    execute: async ({ startObjectId, endObjectId }: { startObjectId: string; endObjectId: string }) => {
      const query = `MATCH p=shortestPath((s)-[*1..]->(e)) WHERE s.objectid = "${startObjectId}" AND e.objectid = "${endObjectId}" RETURN p`;
      const data = await runCypher(query);
      const { graph } = transformCypherGraph(data);

      if (!graph) {
        return { found: false, message: "No path found between these objects." };
      }

      return {
        found: true,
        pathLength: graph.edges.length,
        nodes: graph.nodes,
        edges: graph.edges,
        nodeIds: graph.nodeIds,
        edgeIds: graph.edgeIds,
        graphData: graph.graphData,
      };
    },
  }),

  get_domain_info: defineTool({
    description: "Get information about all domains in the BloodHound database, including collection status. Use to understand the scope of the environment.",
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

// ═══════════════════════════════════════════════════════════
// STRUCTURED ANALYTICAL TOOLS — The VISION's Tool Catalog
// These replace raw Cypher generation. Each encapsulates a
// tested, parameterized query. The LLM does intent recognition
// and tool selection — not query generation.
// ═══════════════════════════════════════════════════════════

export const analyticalTools: ToolSet = {
  // ─── Enumeration Category ───────────────────────────────

  find_kerberoastable_users: defineTool({
    description:
      "Find all Kerberoastable users — accounts with Service Principal Names (SPNs) set. These accounts can have their service tickets requested and cracked offline to recover passwords. Returns user names, objectIds, and SPNs. MITRE ATT&CK: T1558.003",
    parameters: z.object({
      domain: z.string().optional().describe("Filter by domain name (e.g., 'PHANTOM.CORP'). Omit for all domains."),
    }),
    execute: async ({ domain }: { domain?: string }) => {
      const domainFilter = domain ? ` AND u.domain = "${domain}"` : "";
      const query = `MATCH (u:User) WHERE u.hasspn = true AND u.enabled = true${domainFilter} RETURN u.name AS name, u.objectid AS objectid, u.serviceprincipalnames AS spns`;
      const data = await runCypher(query);
      const { literals } = transformCypherGraph(data);
      const rows = extractLiteralRows(literals);

      return {
        count: rows.length,
        users: rows.map((r) => ({
          name: r["u.name"],
          objectId: r["u.objectid"],
          spns: r["u.spns"],
        })),
        riskContext: "Kerberoastable accounts can be attacked offline — password strength is the only defense. Accounts with paths to Domain Admin are critical priority.",
        mitre: { technique: "Kerberoasting", id: "T1558.003" },
      };
    },
  }),

  find_asrep_roastable_users: defineTool({
    description:
      "Find all AS-REP Roastable users — accounts that don't require Kerberos pre-authentication. These can have their AS-REP tickets requested and cracked offline without any credentials. MITRE ATT&CK: T1558.004",
    parameters: z.object({
      domain: z.string().optional().describe("Filter by domain name. Omit for all domains."),
    }),
    execute: async ({ domain }: { domain?: string }) => {
      const domainFilter = domain ? ` AND u.domain = "${domain}"` : "";
      const query = `MATCH (u:User) WHERE u.dontreqpreauth = true AND u.enabled = true${domainFilter} RETURN u.name AS name, u.objectid AS objectid`;
      const data = await runCypher(query);
      const { literals } = transformCypherGraph(data);
      const rows = extractLiteralRows(literals);

      return {
        count: rows.length,
        users: rows.map((r) => ({
          name: r["u.name"],
          objectId: r["u.objectid"],
        })),
        riskContext: "AS-REP Roastable accounts can be attacked without ANY credentials — anyone on the network can request their ticket.",
        mitre: { technique: "AS-REP Roasting", id: "T1558.004" },
      };
    },
  }),

  find_unconstrained_delegation: defineTool({
    description:
      "Find all computers with Unconstrained Delegation enabled. These machines cache TGTs of all authenticating users, meaning compromise of one gives access to all users who have authenticated to it — including Domain Admins. MITRE ATT&CK: T1558.001",
    parameters: z.object({
      domain: z.string().optional().describe("Filter by domain name. Omit for all domains."),
    }),
    execute: async ({ domain }: { domain?: string }) => {
      const domainFilter = domain ? ` AND c.domain = "${domain}"` : "";
      const query = `MATCH (c:Computer) WHERE c.unconstraineddelegation = true${domainFilter} RETURN c.name AS name, c.objectid AS objectid`;
      const data = await runCypher(query);
      const { literals } = transformCypherGraph(data);
      const rows = extractLiteralRows(literals);

      return {
        count: rows.length,
        computers: rows.map((r) => ({
          name: r["c.name"],
          objectId: r["c.objectid"],
        })),
        riskContext: "Unconstrained Delegation is extremely dangerous. Any Domain Admin authenticating to these machines has their TGT cached — enabling full domain compromise from a single machine.",
        mitre: { technique: "Steal or Forge Kerberos Tickets", id: "T1558.001" },
      };
    },
  }),

  list_tier_zero_assets: defineTool({
    description:
      "List all Tier Zero assets in the environment — the most privileged objects tagged by BloodHound as admin_tier_0. These include Domain Admins, Enterprise Admins, Domain Controllers, and other critical objects. These are the gravitational center of all attack path analysis.",
    parameters: z.object({
      domain: z.string().optional().describe("Filter by domain name. Omit for all domains."),
      limit: z.number().optional().default(50).describe("Max results to return"),
    }),
    execute: async ({ domain, limit }: { domain?: string; limit: number }) => {
      const domainFilter = domain ? ` AND n.domain = "${domain}"` : "";
      const query = `MATCH (n) WHERE n.system_tags CONTAINS "admin_tier_0"${domainFilter} RETURN n.name AS name, n.objectid AS objectid ORDER BY n.name LIMIT ${limit}`;
      const data = await runCypher(query);
      const { literals } = transformCypherGraph(data);
      const rows = extractLiteralRows(literals);

      return {
        count: rows.length,
        assets: rows.map((r) => ({
          name: r["n.name"],
          objectId: r["n.objectid"],
        })),
        context: "Tier Zero assets are the ultimate targets. Every attack path analysis should consider paths TO these objects.",
      };
    },
  }),

  // ─── Path Analysis Category ─────────────────────────────

  find_da_paths: defineTool({
    description:
      "Find shortest attack paths from enabled users to Domain Admins. Returns the paths as a graph for canvas visualization. This is the primary attack surface view — shows how many users can reach Domain Admin and through what intermediate objects.",
    parameters: z.object({
      domain: z.string().optional().describe("Filter by domain name. Omit for all domains."),
      limit: z.number().optional().default(10).describe("Max number of paths to return"),
    }),
    execute: async ({ domain, limit }: { domain?: string; limit: number }) => {
      const domainFilter = domain ? ` AND u.domain = "${domain}"` : "";
      const query = `MATCH p=shortestPath((u:User)-[*1..]->(g:Group)) WHERE g.name STARTS WITH "DOMAIN ADMINS" AND u.enabled = true AND NOT u.name STARTS WITH "KRBTGT"${domainFilter} RETURN p LIMIT ${limit}`;
      const data = await runCypher(query);
      const { graph } = transformCypherGraph(data);

      if (!graph) {
        return { found: false, pathCount: 0, message: "No paths to Domain Admins found." };
      }

      return {
        found: true,
        pathCount: graph.edges.length,
        nodeCount: graph.nodes.length,
        nodes: graph.nodes,
        edges: graph.edges,
        nodeIds: graph.nodeIds,
        edgeIds: graph.edgeIds,
        graphData: graph.graphData,
      };
    },
  }),

  find_paths_to_tier_zero: defineTool({
    description:
      "Find all shortest attack paths from a specific source object to any Tier Zero asset. Use this after identifying a compromised or vulnerable account to understand its potential impact — how far can the attacker reach from this position?",
    parameters: z.object({
      sourceObjectId: z.string().describe("ObjectId of the source node to analyze"),
      limit: z.number().optional().default(10).describe("Max paths to return"),
    }),
    execute: async ({ sourceObjectId, limit }: { sourceObjectId: string; limit: number }) => {
      const query = `MATCH p=shortestPath((s)-[*1..]->(t)) WHERE s.objectid = "${sourceObjectId}" AND t.system_tags CONTAINS "admin_tier_0" RETURN p LIMIT ${limit}`;
      const data = await runCypher(query);
      const { graph } = transformCypherGraph(data);

      if (!graph) {
        return { found: false, message: "No paths to Tier Zero assets from this object." };
      }

      // Identify which tier zero assets were reached
      const tierZeroTargets = graph.nodes.filter((n) => n.isTierZero);

      return {
        found: true,
        pathCount: graph.edges.length,
        tierZeroTargetsReached: tierZeroTargets.length,
        targets: tierZeroTargets.map((t) => ({ name: t.label, objectId: t.id })),
        nodes: graph.nodes,
        edges: graph.edges,
        nodeIds: graph.nodeIds,
        edgeIds: graph.edgeIds,
        graphData: graph.graphData,
      };
    },
  }),

  // ─── Analysis Category ──────────────────────────────────

  find_choke_points: defineTool({
    description:
      "Identify choke points — intermediate objects that appear on the most attack paths to Domain Admins. Remediating a choke point eliminates ALL paths that flow through it. This is the highest-leverage remediation analysis: fix one object, eliminate many attack paths. Returns objects ranked by the number of paths they appear on.",
    parameters: z.object({
      domain: z.string().optional().describe("Filter by domain name. Omit for all domains."),
      limit: z.number().optional().default(15).describe("Max choke points to return"),
    }),
    execute: async ({ domain, limit }: { domain?: string; limit: number }) => {
      const domainFilter = domain ? ` AND u.domain = "${domain}"` : "";

      // First: count total DA paths for context
      const countQuery = `MATCH p=shortestPath((u:User)-[*1..]->(g:Group)) WHERE g.name STARTS WITH "DOMAIN ADMINS" AND u.enabled = true AND NOT u.name STARTS WITH "KRBTGT"${domainFilter} RETURN count(p) AS totalPaths`;
      const countData = await runCypher(countQuery);
      const countLiterals = (countData as unknown as { literals?: { key: string; value: unknown }[] }).literals || [];
      const totalPaths = Number(countLiterals[0]?.value) || 0;

      // Second: find choke points — intermediate nodes that appear on the most DA paths
      const chokeQuery = `MATCH p=shortestPath((u:User)-[*1..]->(g:Group)) WHERE g.name STARTS WITH "DOMAIN ADMINS" AND u.enabled = true AND NOT u.name STARTS WITH "KRBTGT"${domainFilter} UNWIND nodes(p) AS n WITH n WHERE NOT n.name STARTS WITH "DOMAIN ADMINS" RETURN n.name AS name, n.objectid AS objectid, count(*) AS pathCount ORDER BY pathCount DESC LIMIT ${limit}`;
      const chokeData = await runCypher(chokeQuery);
      const { literals } = transformCypherGraph(chokeData);
      const rows = extractLiteralRows(literals);

      return {
        totalDAPathsInEnvironment: totalPaths,
        chokePoints: rows.map((r) => ({
          name: r["n.name"],
          objectId: r["n.objectid"],
          pathsThrough: Number(r["count(*)"]) || 0,
          percentageOfPaths: totalPaths > 0 ? Math.round(((Number(r["count(*)"]) || 0) / totalPaths) * 100) : 0,
        })),
        analysisContext: "Choke points are the highest-leverage remediation targets. Remediating the top choke point eliminates the most attack paths with a single change. Focus on non-user choke points (groups, computers, OUs) as these affect multiple paths.",
      };
    },
  }),

  calculate_blast_radius: defineTool({
    description:
      "Calculate the blast radius of an AD object — how many other objects are reachable from it through outbound attack paths. A high blast radius means compromise of this object cascades widely. Use to quantify impact of a compromised account or to prioritize remediation.",
    parameters: z.object({
      objectId: z.string().describe("ObjectId of the object to analyze"),
      maxDepth: z.number().optional().default(5).describe("Maximum relationship depth to traverse (1-10)"),
    }),
    execute: async ({ objectId, maxDepth }: { objectId: string; maxDepth: number }) => {
      const depth = Math.min(Math.max(maxDepth, 1), 10);

      // Count distinct reachable objects
      const countQuery = `MATCH (s)-[*1..${depth}]->(t) WHERE s.objectid = "${objectId}" RETURN count(DISTINCT t) AS reachableCount`;
      const countData = await runCypher(countQuery);
      const countLiterals = (countData as unknown as { literals?: { key: string; value: unknown }[] }).literals || [];
      const reachableCount = Number(countLiterals[0]?.value) || 0;

      // Check if any tier zero assets are reachable
      const tierZeroQuery = `MATCH (s)-[*1..${depth}]->(t) WHERE s.objectid = "${objectId}" AND t.system_tags CONTAINS "admin_tier_0" RETURN count(DISTINCT t) AS tierZeroCount`;
      const tierZeroData = await runCypher(tierZeroQuery);
      const tzLiterals = (tierZeroData as unknown as { literals?: { key: string; value: unknown }[] }).literals || [];
      const tierZeroReachable = Number(tzLiterals[0]?.value) || 0;

      return {
        objectId,
        blastRadius: reachableCount,
        maxDepthUsed: depth,
        tierZeroAssetsReachable: tierZeroReachable,
        riskAssessment:
          tierZeroReachable > 0
            ? `CRITICAL: This object can reach ${tierZeroReachable} Tier Zero asset(s) within ${depth} hops. Blast radius: ${reachableCount} total objects.`
            : reachableCount > 100
              ? `HIGH: Large blast radius of ${reachableCount} objects, though no direct path to Tier Zero within ${depth} hops.`
              : `Blast radius: ${reachableCount} objects within ${depth} hops.`,
      };
    },
  }),

  find_dangerous_permissions: defineTool({
    description:
      "Find dangerous ACL-based permissions (GenericAll, WriteDACL, WriteOwner, Owns, ForceChangePassword, AddMember, GenericWrite, AllExtendedRights) targeting Tier Zero assets or a specific object. These permissions often create direct attack paths to the highest-privilege objects.",
    parameters: z.object({
      targetObjectId: z.string().optional().describe("Find dangerous permissions targeting a specific object. Omit to find ALL dangerous permissions on Tier Zero assets."),
      domain: z.string().optional().describe("Filter by domain name. Omit for all domains."),
      limit: z.number().optional().default(30).describe("Max results to return"),
    }),
    execute: async ({ targetObjectId, domain, limit }: { targetObjectId?: string; domain?: string; limit: number }) => {
      let whereClause: string;
      if (targetObjectId) {
        whereClause = `WHERE t.objectid = "${targetObjectId}"`;
      } else {
        const domainFilter = domain ? ` AND t.domain = "${domain}"` : "";
        whereClause = `WHERE t.system_tags CONTAINS "admin_tier_0"${domainFilter}`;
      }

      const query = `MATCH (s)-[r:GenericAll|GenericWrite|WriteDACL|WriteOwner|Owns|ForceChangePassword|AddMember|AllExtendedRights]->(t) ${whereClause} RETURN s.name AS sourceName, s.objectid AS sourceId, type(r) AS permission, t.name AS targetName, t.objectid AS targetId LIMIT ${limit}`;
      const data = await runCypher(query);
      const { literals } = transformCypherGraph(data);
      const rows = extractLiteralRows(literals);

      return {
        count: rows.length,
        permissions: rows.map((r) => ({
          source: r["s.name"] || r["sourceName"],
          sourceObjectId: r["s.objectid"] || r["sourceId"],
          permission: r["type(r)"] || r["permission"],
          target: r["t.name"] || r["targetName"],
          targetObjectId: r["t.objectid"] || r["targetId"],
        })),
        riskContext: targetObjectId
          ? "These are direct dangerous permissions on the specified object. Each represents a potential one-hop attack path."
          : "These are dangerous permissions targeting Tier Zero assets. Each represents a potential privilege escalation vector.",
      };
    },
  }),

  // ─── Remediation Category ───────────────────────────────

  simulate_remediation: defineTool({
    description:
      "Simulate the impact of remediating a specific object by counting how many Domain Admin attack paths currently flow through it. Shows how many paths would be eliminated if this object's risky configurations were fixed. Use this to quantify remediation impact before recommending changes.",
    parameters: z.object({
      objectId: z.string().describe("ObjectId of the object to simulate remediating"),
      domain: z.string().optional().describe("Filter by domain name. Omit for all domains."),
    }),
    execute: async ({ objectId, domain }: { objectId: string; domain?: string }) => {
      const domainFilter = domain ? ` AND u.domain = "${domain}"` : "";

      // Count total DA paths
      const totalQuery = `MATCH p=shortestPath((u:User)-[*1..]->(g:Group)) WHERE g.name STARTS WITH "DOMAIN ADMINS" AND u.enabled = true AND NOT u.name STARTS WITH "KRBTGT"${domainFilter} RETURN count(p) AS totalPaths`;
      const totalData = await runCypher(totalQuery);
      const totalLiterals = (totalData as unknown as { literals?: { key: string; value: unknown }[] }).literals || [];
      const totalPaths = Number(totalLiterals[0]?.value) || 0;

      // Count paths through this specific object
      const throughQuery = `MATCH p=shortestPath((u:User)-[*1..]->(g:Group)) WHERE g.name STARTS WITH "DOMAIN ADMINS" AND u.enabled = true AND NOT u.name STARTS WITH "KRBTGT"${domainFilter} UNWIND nodes(p) AS n WITH p, n WHERE n.objectid = "${objectId}" RETURN count(DISTINCT p) AS pathsThrough`;
      const throughData = await runCypher(throughQuery);
      const throughLiterals = (throughData as unknown as { literals?: { key: string; value: unknown }[] }).literals || [];
      const pathsThrough = Number(throughLiterals[0]?.value) || 0;

      const percentReduction = totalPaths > 0 ? Math.round((pathsThrough / totalPaths) * 100) : 0;

      return {
        objectId,
        totalDAPathsInEnvironment: totalPaths,
        pathsThroughThisObject: pathsThrough,
        percentageOfAllPaths: percentReduction,
        pathsRemainingAfterRemediation: totalPaths - pathsThrough,
        impactAssessment:
          percentReduction >= 30
            ? `CRITICAL IMPACT: Remediating this object eliminates ${pathsThrough} of ${totalPaths} DA paths (${percentReduction}%). This is a high-priority choke point.`
            : percentReduction >= 10
              ? `SIGNIFICANT IMPACT: Remediating this object eliminates ${pathsThrough} of ${totalPaths} DA paths (${percentReduction}%).`
              : percentReduction > 0
                ? `MODERATE IMPACT: Remediating this object eliminates ${pathsThrough} of ${totalPaths} DA paths (${percentReduction}%).`
                : "This object does not appear on any Domain Admin attack paths.",
      };
    },
  }),
};

// ═══════════════════════════════════════════════════════════
// ADVANCED — Raw Cypher escape hatch (demoted)
// Per VISION Section 4.3: Cypher is an implementation detail.
// Use structured tools above for 95%+ of analysis.
// This exists only for edge cases the structured tools don't cover.
// ═══════════════════════════════════════════════════════════

export const advancedTools: ToolSet = {
  run_cypher_query: defineTool({
    description:
      "ADVANCED FALLBACK: Execute a raw Cypher query against the BloodHound graph. Only use this if none of the structured analytical tools (find_kerberoastable_users, find_choke_points, calculate_blast_radius, etc.) cover the specific analysis needed. Prefer structured tools — they return richer, pre-interpreted results.",
    parameters: z.object({
      query: z.string().describe("Cypher query to execute"),
      description: z.string().describe("Brief description of what this query does — shown to the user"),
    }),
    execute: async ({ query }: { query: string }) => {
      const data = await runCypher(query);
      const { graph, literals } = transformCypherGraph(data);

      const result: {
        hasGraph: boolean;
        nodes?: { id: string; label: string; kind: string }[];
        edges?: { source: string; target: string; label: string }[];
        literals?: { key: string; value: unknown }[];
        graphData?: ReturnType<typeof transformBHGraph>;
      } = { hasGraph: false };

      if (graph) {
        result.hasGraph = true;
        result.nodes = graph.nodes;
        result.edges = graph.edges;
        result.graphData = graph.graphData;
      }

      if (literals.length > 0) {
        result.literals = literals;
      }

      return result;
    },
  }),
};

// ═══════════════════════════════════════════════════════════
// CLIENT-SIDE TOOLS — handled by onToolCall in ChatPanel
// ═══════════════════════════════════════════════════════════

export const clientTools: ToolSet = {
  highlight_graph_elements: defineTool({
    description:
      "Highlight specific nodes and/or edges on the graph canvas to draw attention to attack paths, vulnerable objects, or important relationships. Nodes get a red highlight ring, edges get animated. ALWAYS use this after finding attack paths or identifying risky objects.",
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
      "Add a security finding and its remediation to the remediation plan. Use after identifying a vulnerability or risky configuration. Include quantitative impact data when available (blast radius, paths eliminated, MITRE mapping).",
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
      blastRadius: z
        .number()
        .optional()
        .describe("Number of objects reachable from this finding"),
      pathsEliminated: z
        .number()
        .optional()
        .describe("Number of DA attack paths eliminated by this remediation"),
      totalDAPaths: z
        .number()
        .optional()
        .describe("Total DA paths in environment (for percentage calculation)"),
      mitreTechnique: z
        .string()
        .optional()
        .describe("MITRE ATT&CK technique name (e.g., 'Kerberoasting')"),
      mitreId: z
        .string()
        .optional()
        .describe("MITRE ATT&CK technique ID (e.g., 'T1558.003')"),
      verificationQuery: z
        .string()
        .optional()
        .describe("Natural language query to verify remediation was effective (e.g., 'Show me kerberoastable users in PHANTOM.CORP')"),
    }),
  }),
};

export const allTools: ToolSet = {
  ...coreTools,
  ...analyticalTools,
  ...advancedTools,
  ...clientTools,
};
