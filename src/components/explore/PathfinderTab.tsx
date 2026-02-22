"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowUpDown, Loader2 } from "lucide-react";
import { SearchInput } from "./SearchInput";
import { NodeTypeIcon } from "./NodeTypeIcon";
import { useExploreStore } from "@/lib/store/explore-store";
import { useGraphStore } from "@/lib/store/graph-store";
import { transformBHGraph } from "@/lib/bloodhound/transform";
import type { SelectedNode } from "@/types";

export function PathfinderTab() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pathHops, setPathHops] = useState<number | null>(null);
  const [pathNodes, setPathNodes] = useState<{ label: string; kind: SelectedNode["kind"] }[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const pathStart = useExploreStore((s) => s.pathStart);
  const pathEnd = useExploreStore((s) => s.pathEnd);
  const setPathStart = useExploreStore((s) => s.setPathStart);
  const setPathEnd = useExploreStore((s) => s.setPathEnd);
  const swapPathEndpoints = useExploreStore((s) => s.swapPathEndpoints);

  const setGraph = useGraphStore((s) => s.setGraph);
  const highlightNodes = useGraphStore((s) => s.highlightNodes);
  const highlightEdges = useGraphStore((s) => s.highlightEdges);
  const requestFitView = useGraphStore((s) => s.requestFitView);

  const findPath = useCallback(
    async (start: SelectedNode, end: SelectedNode) => {
      // Abort any in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError(null);
      setPathHops(null);
      setPathNodes([]);

      try {
        const query = `MATCH p=shortestPath((s)-[*1..]->(e)) WHERE s.objectid = "${start.objectId}" AND e.objectid = "${end.objectId}" RETURN p`;

        const res = await fetch("/api/cypher", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Query failed: ${res.status}`);
        }

        const data = await res.json();

        // Check for empty results
        const nodeCount = data.data?.nodes
          ? Object.keys(data.data.nodes).length
          : data.nodes
            ? Object.keys(data.nodes).length
            : 0;

        if (nodeCount === 0) {
          setError("No path found between these nodes");
          return;
        }

        const graphData = data.data || data;
        const { nodes, edges } = transformBHGraph(graphData);

        setGraph(nodes, edges);
        highlightNodes(nodes.map((n) => n.id));
        highlightEdges(edges.map((e) => e.id));
        requestFitView();

        // Build path summary
        setPathHops(edges.length);
        setPathNodes(
          nodes.map((n) => ({
            label: n.data.label,
            kind: n.data.kind,
          }))
        );
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Path query failed");
      } finally {
        setIsLoading(false);
      }
    },
    [setGraph, highlightNodes, highlightEdges, requestFitView]
  );

  // Auto-pathfind when both endpoints are set
  useEffect(() => {
    if (pathStart && pathEnd) {
      findPath(pathStart, pathEnd);
    } else {
      // Clear results when an endpoint is removed
      setPathHops(null);
      setPathNodes([]);
      setError(null);
    }

    return () => {
      abortRef.current?.abort();
    };
  }, [pathStart, pathEnd, findPath]);

  const handleStartSelect = useCallback(
    (node: SelectedNode) => setPathStart(node),
    [setPathStart]
  );

  const handleEndSelect = useCallback(
    (node: SelectedNode) => setPathEnd(node),
    [setPathEnd]
  );

  const handleStartClear = useCallback(
    () => setPathStart(null),
    [setPathStart]
  );

  const handleEndClear = useCallback(
    () => setPathEnd(null),
    [setPathEnd]
  );

  return (
    <div className="p-3 space-y-3">
      {/* Google Maps-style pathfinder layout */}
      <div className="flex gap-2">
        {/* Left: Visual connector */}
        <div className="flex flex-col items-center py-2.5 w-4 flex-shrink-0">
          {/* Start circle */}
          <div className="w-2.5 h-2.5 rounded-full border-2 border-cyan-400 bg-cyan-400/30 flex-shrink-0" />
          {/* Dotted line */}
          <div className="flex-1 w-px border-l border-dashed border-zinc-600 my-1" />
          {/* End target/bullseye */}
          <div className="w-2.5 h-2.5 rounded-full border-2 border-orange-400 flex-shrink-0 flex items-center justify-center">
            <div className="w-1 h-1 rounded-full bg-orange-400" />
          </div>
        </div>

        {/* Center: Search inputs */}
        <div className="flex-1 space-y-2 min-w-0">
          <SearchInput
            placeholder="Start node..."
            onSelect={handleStartSelect}
            selectedNode={pathStart}
            onClear={handleStartClear}
            autoFocus
          />
          <SearchInput
            placeholder="Destination node..."
            onSelect={handleEndSelect}
            selectedNode={pathEnd}
            onClear={handleEndClear}
          />
        </div>

        {/* Right: Swap button */}
        <div className="flex items-center flex-shrink-0">
          <button
            onClick={swapPathEndpoints}
            disabled={!pathStart && !pathEnd}
            className="w-7 h-7 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Swap start and destination"
          >
            <ArrowUpDown size={14} />
          </button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center gap-2 text-zinc-500 text-[12px] py-1">
          <Loader2 size={14} className="animate-spin text-cyan-400" />
          <span>Finding path...</span>
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="text-[12px] text-red-400 bg-red-950/30 border border-red-900/50 rounded-md px-2.5 py-2">
          {error}
        </div>
      )}

      {/* Path result summary */}
      {pathHops !== null && !isLoading && !error && (
        <div className="bg-zinc-800/50 rounded-md p-2 space-y-1.5">
          <div className="text-[12px] text-zinc-300">
            Path found: <span className="text-cyan-400 font-medium">{pathHops} hop{pathHops !== 1 ? "s" : ""}</span>
          </div>
          {pathNodes.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap text-[11px] text-zinc-500">
              {pathNodes.map((node, i) => (
                <span key={i} className="flex items-center gap-0.5">
                  {i > 0 && <span className="text-zinc-600 mx-0.5">&rarr;</span>}
                  <NodeTypeIcon kind={node.kind} size={10} />
                  <span className="truncate max-w-[100px]">{node.label}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
