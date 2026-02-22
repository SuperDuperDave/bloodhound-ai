"use client";

import { useState, useCallback } from "react";
import { Clock, Loader2 } from "lucide-react";
import { SearchInput } from "./SearchInput";
import { NodeTypeIcon } from "./NodeTypeIcon";
import { useGraphStore } from "@/lib/store/graph-store";
import { useChatStore } from "@/lib/store/chat-store";
import { transformBHGraph } from "@/lib/bloodhound/transform";
import type { SelectedNode } from "@/types";

interface RecentSearch {
  objectId: string;
  label: string;
  kind: SelectedNode["kind"];
}

export function SearchTab() {
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addGraph = useGraphStore((s) => s.addGraph);
  const selectNode = useGraphStore((s) => s.selectNode);
  const highlightNodes = useGraphStore((s) => s.highlightNodes);
  const requestFitView = useGraphStore((s) => s.requestFitView);
  const addContextChip = useChatStore((s) => s.addContextChip);

  const fetchAndDisplay = useCallback(
    async (node: SelectedNode) => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/cypher", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `MATCH (n)-[r]-(m) WHERE n.objectid = "${node.objectId}" RETURN n,r,m LIMIT 50`,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Failed to fetch node: ${res.status}`);
        }

        const json = await res.json();
        const graphData = json.data || json;

        // Check if we got graph nodes
        const nodeCount = graphData.nodes ? Object.keys(graphData.nodes).length : 0;
        if (nodeCount === 0) {
          // Node exists but has no relationships — still select it
          selectNode(node.objectId);
          addContextChip({ objectId: node.objectId, label: node.label, kind: node.kind });
          return;
        }

        const { nodes, edges } = transformBHGraph(graphData);

        addGraph(nodes, edges);
        selectNode(node.objectId);
        highlightNodes([node.objectId]);
        addContextChip({
          objectId: node.objectId,
          label: node.label,
          kind: node.kind,
        });
        requestFitView();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load node data");
      } finally {
        setIsLoading(false);
      }
    },
    [addGraph, selectNode, highlightNodes, addContextChip, requestFitView]
  );

  const handleSelect = useCallback(
    (node: SelectedNode) => {
      // Add to recent searches (deduplicate, keep last 5)
      setRecentSearches((prev) => {
        const filtered = prev.filter((r) => r.objectId !== node.objectId);
        return [
          { objectId: node.objectId, label: node.label, kind: node.kind },
          ...filtered,
        ].slice(0, 5);
      });

      fetchAndDisplay(node);
    },
    [fetchAndDisplay]
  );

  const handleRecentClick = useCallback(
    (recent: RecentSearch) => {
      fetchAndDisplay({
        objectId: recent.objectId,
        label: recent.label,
        kind: recent.kind,
      });
    },
    [fetchAndDisplay]
  );

  return (
    <div className="p-3 space-y-3">
      <SearchInput
        placeholder="Search users, computers, groups..."
        onSelect={handleSelect}
        autoFocus
      />

      {isLoading && (
        <div className="flex items-center gap-2 text-zinc-500 text-[12px] py-2">
          <Loader2 size={14} className="animate-spin text-cyan-400" />
          <span>Loading node data...</span>
        </div>
      )}

      {error && (
        <div className="text-[12px] text-red-400 bg-red-950/30 border border-red-900/50 rounded-md px-2.5 py-2">
          {error}
        </div>
      )}

      {recentSearches.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mb-2">
            <Clock size={11} />
            <span>Recent</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {recentSearches.map((recent) => (
              <button
                key={recent.objectId}
                onClick={() => handleRecentClick(recent)}
                disabled={isLoading}
                className="flex items-center gap-1.5 bg-zinc-800/60 hover:bg-zinc-700/60 border border-zinc-700/50 rounded-md px-2 py-1 text-[11px] text-zinc-300 hover:text-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <NodeTypeIcon kind={recent.kind} size={11} />
                <span className="truncate max-w-[140px]">{recent.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
