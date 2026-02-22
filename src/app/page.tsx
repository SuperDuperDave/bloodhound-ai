"use client";

import { useEffect, useState } from "react";
import { GraphCanvas } from "@/components/graph/GraphCanvas";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { EnvironmentDashboard } from "@/components/dashboard/EnvironmentDashboard";
import { RemediationPanel } from "@/components/remediation/RemediationPanel";
import { useGraphStore } from "@/lib/store/graph-store";
import { useEnvironmentStore } from "@/lib/store/environment-store";
import type { Node, Edge } from "@xyflow/react";
import type { ADNodeData, ADEdgeData, EnvironmentStats } from "@/types";

export default function Home() {
  const { setGraph } = useGraphStore();
  const { setStats, setLoading, setError } = useEnvironmentStore();
  const [greeting, setGreeting] = useState<string>("");

  useEffect(() => {
    async function init(retries = 2) {
      setLoading(true);
      try {
        const res = await fetch("/api/init");
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          // Retry on 500 (which wraps BH 429s)
          if (res.status === 500 && retries > 0) {
            await new Promise((r) => setTimeout(r, 2000));
            return init(retries - 1);
          }
          throw new Error(data.error || `Init failed: ${res.status}`);
        }
        const data = await res.json();

        // Set environment stats
        setStats(data.stats as EnvironmentStats);

        // Set initial graph
        if (data.initialGraph?.nodes?.length > 0) {
          setGraph(
            data.initialGraph.nodes as Node<ADNodeData>[],
            data.initialGraph.edges as Edge<ADEdgeData>[]
          );
        }

        // Set AI greeting
        if (data.greeting) {
          setGreeting(data.greeting);
        }
      } catch (err) {
        console.error("Init error:", err);
        setError(err instanceof Error ? err.message : "Failed to initialize");
      }
    }

    init();
  }, [setGraph, setStats, setLoading, setError]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 h-11 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm flex items-center px-4 gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-red-600 flex items-center justify-center">
            <span className="text-white text-xs font-black">BH</span>
          </div>
          <span className="text-sm font-bold text-zinc-100">BloodHound AI</span>
        </div>
        <div className="h-4 w-px bg-zinc-700" />
        <span className="text-[11px] text-zinc-500">
          Conversational Attack Path Intelligence
        </span>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Graph + Dashboard */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Graph Canvas */}
          <div className="flex-1 min-h-0 relative">
            <GraphCanvas />
            {/* Floating Dashboard */}
            <div className="absolute bottom-3 left-3 w-[380px] max-h-[280px] bg-zinc-900/95 backdrop-blur-sm border border-zinc-700/50 rounded-lg overflow-hidden shadow-2xl">
              <EnvironmentDashboard />
            </div>
          </div>
        </div>

        {/* Right: Chat Panel */}
        <div className="w-[420px] flex-shrink-0 flex flex-col min-h-0">
          <div className="flex-1 min-h-0">
            <ChatPanel initialGreeting={greeting} />
          </div>
          <RemediationPanel />
        </div>
      </div>
    </div>
  );
}
