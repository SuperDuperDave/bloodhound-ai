import { NextResponse } from "next/server";
import { getDomains, runCypher } from "@/lib/bloodhound/client";
import { transformBHGraph } from "@/lib/bloodhound/transform";

export async function GET() {
  try {
    // Batch 1: domains + initial graph (most important for first render)
    const [domains, initialPaths] = await Promise.all([
      getDomains(),
      runCypher(
        `MATCH p=shortestPath((u:User)-[*1..]->(g:Group)) WHERE g.name STARTS WITH "DOMAIN ADMINS" AND NOT u.name STARTS WITH "KRBTGT" AND u.enabled = true RETURN p LIMIT 5`,
        true
      ),
    ]);

    // Batch 2: risk queries + counts (sequential to avoid rate limits)
    const [kerberoastable, asrepRoastable, unconstrained] = await Promise.all([
      runCypher(
        "MATCH (u:User) WHERE u.hasspn = true AND u.enabled = true RETURN u.name, u.objectid, u.serviceprincipalnames"
      ),
      runCypher(
        "MATCH (u:User) WHERE u.dontreqpreauth = true AND u.enabled = true RETURN u.name, u.objectid"
      ),
      runCypher(
        "MATCH (c:Computer) WHERE c.unconstraineddelegation = true RETURN c.name, c.objectid"
      ),
    ]);

    // Batch 3: counts
    const [userCount, computerCount, groupCount] = await Promise.all([
      runCypher("MATCH (u:User) RETURN count(u) AS count"),
      runCypher("MATCH (c:Computer) RETURN count(c) AS count"),
      runCypher("MATCH (g:Group) RETURN count(g) AS count"),
    ]);

    // Transform initial paths for graph display
    const graphData = initialPaths as unknown as {
      nodes?: Record<string, { label: string; kind: string; objectId: string; isTierZero: boolean; properties?: Record<string, unknown> }>;
      edges?: { source: string; target: string; label: string; kind: string }[];
      literals?: { key: string; value: unknown }[];
    };

    let initialGraph = { nodes: [] as ReturnType<typeof transformBHGraph>["nodes"], edges: [] as ReturnType<typeof transformBHGraph>["edges"] };
    if (graphData.nodes && Object.keys(graphData.nodes).length > 0) {
      initialGraph = transformBHGraph({
        nodes: graphData.nodes,
        edges: graphData.edges || [],
      });
    }

    // Extract counts from literals
    const extractCount = (data: unknown): number => {
      const d = data as { literals?: { key: string; value: unknown }[] };
      if (d.literals && d.literals.length > 0) {
        return Number(d.literals[0].value) || 0;
      }
      return 0;
    };

    const kerbLiterals = kerberoastable as unknown as { literals?: { key: string; value: unknown }[] };
    const asrepLiterals = asrepRoastable as unknown as { literals?: { key: string; value: unknown }[] };
    const unconLiterals = unconstrained as unknown as { literals?: { key: string; value: unknown }[] };

    // Count results from literals
    const kerbCount = kerbLiterals.literals
      ? kerbLiterals.literals.filter((l) => l.key === "u.name").length
      : 0;
    const asrepCount = asrepLiterals.literals
      ? asrepLiterals.literals.filter((l) => l.key === "u.name").length
      : 0;
    const unconCount = unconLiterals.literals
      ? unconLiterals.literals.filter((l) => l.key === "c.name").length
      : 0;

    const stats = {
      domains: domains.map((d) => ({
        id: d.id,
        name: d.name,
        collected: d.collected,
        type: d.type,
        impactValue: 0,
      })),
      totalUsers: extractCount(userCount),
      totalComputers: extractCount(computerCount),
      totalGroups: extractCount(groupCount),
      kerberoastableUsers: kerbCount,
      asrepRoastableUsers: asrepCount,
      unconstrainedDelegation: unconCount,
      daPathCount: initialGraph.edges.length > 0 ? initialGraph.nodes.length : 0,
    };

    // Build findings summary for the AI greeting
    const findings: string[] = [];
    if (kerbCount > 0) findings.push(`${kerbCount} Kerberoastable user(s)`);
    if (asrepCount > 0) findings.push(`${asrepCount} AS-REP Roastable user(s)`);
    if (unconCount > 0) findings.push(`${unconCount} computer(s) with Unconstrained Delegation`);
    if (initialGraph.nodes.length > 0)
      findings.push(`${initialGraph.nodes.length} nodes in shortest paths to Domain Admins`);

    return NextResponse.json({
      stats,
      initialGraph,
      findings,
      greeting: buildGreeting(stats, findings),
    });
  } catch (error) {
    console.error("Init error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to connect to BloodHound" },
      { status: 500 }
    );
  }
}

function buildGreeting(
  stats: { domains: { name: string; collected: boolean }[]; totalUsers: number; totalComputers: number; totalGroups: number },
  findings: string[]
): string {
  const collectedDomains = stats.domains.filter((d) => d.collected);
  let greeting = `I've connected to your BloodHound instance and scanned ${collectedDomains.length} domain(s): **${collectedDomains.map((d) => d.name).join(", ")}**.\n\n`;
  greeting += `Environment: ${stats.totalUsers} users, ${stats.totalComputers} computers, ${stats.totalGroups} groups.\n\n`;

  if (findings.length > 0) {
    greeting += `**Initial findings:**\n${findings.map((f) => `- ${f}`).join("\n")}\n\n`;
  }

  greeting += `The graph shows the shortest attack paths to Domain Admins. Click any node to select it, then ask me about it. What would you like to investigate?`;

  return greeting;
}
