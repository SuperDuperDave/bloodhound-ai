"use client";

import { useState, useCallback, useRef } from "react";
import { Play, Loader2 } from "lucide-react";
import { PrebuiltQueries } from "./PrebuiltQueries";
import { CypherEditor } from "./CypherEditor";
import { useExploreStore } from "@/lib/store/explore-store";
import { useGraphStore } from "@/lib/store/graph-store";
import { transformBHGraph } from "@/lib/bloodhound/transform";

interface TabularRow {
  [key: string]: unknown;
}

export function CypherTab() {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabularResults, setTabularResults] = useState<TabularRow[] | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const cypherQuery = useExploreStore((s) => s.cypherQuery);
  const setCypherQuery = useExploreStore((s) => s.setCypherQuery);
  const addToHistory = useExploreStore((s) => s.addToHistory);

  const setGraph = useGraphStore((s) => s.setGraph);
  const highlightNodes = useGraphStore((s) => s.highlightNodes);
  const requestFitView = useGraphStore((s) => s.requestFitView);

  const runQuery = useCallback(async () => {
    const query = cypherQuery.trim();
    if (!query || isRunning) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsRunning(true);
    setError(null);
    setTabularResults(null);

    try {
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

      const json = await res.json();
      const data = json.data;

      addToHistory(query);

      // Determine if result is graph data (has nodes/edges) or tabular
      if (data && typeof data === "object" && data.nodes && data.edges) {
        // Graph result — transform and display
        const { nodes, edges } = transformBHGraph(data);
        setGraph(nodes, edges);
        highlightNodes(nodes.map((n) => n.id));
        requestFitView();
      } else if (Array.isArray(data) && data.length > 0) {
        // Tabular result — check if any row has graph structure
        const firstRow = data[0];
        if (firstRow && typeof firstRow === "object" && firstRow.nodes && firstRow.edges) {
          // Graph data wrapped in array
          const { nodes, edges } = transformBHGraph(firstRow as { nodes: Record<string, { label: string; kind: string; objectId: string; isTierZero: boolean; properties?: Record<string, unknown> }>; edges: { source: string; target: string; label: string; kind: string }[] });
          setGraph(nodes, edges);
          highlightNodes(nodes.map((n) => n.id));
          requestFitView();
        } else {
          // Pure tabular data
          setTabularResults(data as TabularRow[]);
        }
      } else if (data && typeof data === "object" && !Array.isArray(data)) {
        // Single object result — try as graph, fall back to table
        const keys = Object.keys(data);
        if (keys.length === 0) {
          setError("Query returned no results");
        } else {
          setTabularResults([data as TabularRow]);
        }
      } else {
        setError("Query returned no results");
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Query execution failed");
    } finally {
      setIsRunning(false);
    }
  }, [cypherQuery, isRunning, addToHistory, setGraph, highlightNodes, requestFitView]);

  const handleSelectPrebuilt = useCallback(
    (query: string) => {
      setCypherQuery(query);
    },
    [setCypherQuery]
  );

  return (
    <div className="flex flex-col">
      {/* Prebuilt queries panel */}
      <PrebuiltQueries onSelectQuery={handleSelectPrebuilt} />

      {/* Editor area */}
      <div className="p-3 space-y-2">
        <CypherEditor
          value={cypherQuery}
          onChange={setCypherQuery}
          onRun={runQuery}
          readOnly={isRunning}
        />

        {/* Action bar */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-zinc-600">
            Ctrl+Enter to run
          </span>
          <button
            onClick={runQuery}
            disabled={isRunning || !cypherQuery.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-cyan-600 hover:bg-cyan-500 text-white"
          >
            {isRunning ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play size={13} />
                Run
              </>
            )}
          </button>
        </div>

        {/* Error display */}
        {error && (
          <div className="text-[12px] text-red-400 bg-red-950/30 border border-red-900/50 rounded-md px-2.5 py-2">
            {error}
          </div>
        )}

        {/* Tabular results */}
        {tabularResults && tabularResults.length > 0 && (
          <div className="overflow-x-auto rounded-md border border-zinc-700/50 bg-zinc-800/30">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-zinc-700/50">
                  {Object.keys(tabularResults[0]).map((key) => (
                    <th
                      key={key}
                      className="text-left px-2.5 py-1.5 text-zinc-400 font-medium whitespace-nowrap"
                    >
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tabularResults.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-zinc-800/50 last:border-b-0 hover:bg-zinc-800/40"
                  >
                    {Object.values(row).map((val, j) => (
                      <td
                        key={j}
                        className="px-2.5 py-1.5 text-zinc-300 whitespace-nowrap max-w-[200px] truncate"
                      >
                        {formatCellValue(val)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {tabularResults.length > 0 && (
              <div className="px-2.5 py-1 text-[10px] text-zinc-600 border-t border-zinc-800/50">
                {tabularResults.length} row{tabularResults.length !== 1 ? "s" : ""}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function formatCellValue(val: unknown): string {
  if (val === null || val === undefined) return "null";
  if (typeof val === "boolean") return val ? "true" : "false";
  if (typeof val === "number") return String(val);
  if (typeof val === "string") return val;
  if (Array.isArray(val)) return val.join(", ");
  return JSON.stringify(val);
}
