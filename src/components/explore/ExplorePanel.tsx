"use client";

import { useEffect, useCallback, lazy, Suspense } from "react";
import { Search, Route, Code, ChevronLeft, ChevronRight } from "lucide-react";
import { useExploreStore } from "@/lib/store/explore-store";
import type { ExploreTab } from "@/types";

const SearchTab = lazy(() =>
  import("./SearchTab").then((m) => ({ default: m.SearchTab }))
);
const PathfinderTab = lazy(() =>
  import("./PathfinderTab").then((m) => ({ default: m.PathfinderTab }))
);
const CypherTab = lazy(() =>
  import("./CypherTab").then((m) => ({ default: m.CypherTab }))
);

const tabs: { id: ExploreTab; label: string; icon: typeof Search }[] = [
  { id: "search", label: "Search", icon: Search },
  { id: "pathfinder", label: "Pathfinder", icon: Route },
  { id: "cypher", label: "Cypher", icon: Code },
];

function TabLoader() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="w-5 h-5 border-2 border-zinc-600 border-t-cyan-400 rounded-full animate-spin" />
    </div>
  );
}

export function ExplorePanel() {
  const { activeTab, setActiveTab, isCollapsed, toggleCollapsed, setCollapsed } =
    useExploreStore();

  // Global keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't capture if user is typing in a text input (outside our panel)
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "TEXTAREA" ||
        (target.tagName === "INPUT" && !target.closest("[data-explore-panel]")) ||
        target.isContentEditable;

      if (isInput) return;

      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setActiveTab("search");
        setCollapsed(false);
      }
    },
    [setActiveTab, setCollapsed]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div
      data-explore-panel
      className={`absolute top-3 left-3 z-20 bg-zinc-900/95 backdrop-blur-sm border border-zinc-700/50 rounded-lg shadow-2xl overflow-hidden transition-all duration-200 ${
        activeTab === "cypher" && !isCollapsed ? "w-[600px]" : "w-[410px]"
      }`}
      style={{ maxHeight: "calc(100vh - 340px)" }}
    >
      {/* Tab Bar */}
      <div className="flex items-center border-b border-zinc-800 h-9">
        {/* Collapse toggle */}
        <button
          onClick={toggleCollapsed}
          className="w-9 h-9 flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors flex-shrink-0"
          title={isCollapsed ? "Expand" : "Collapse"}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Tab buttons */}
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (isCollapsed) setCollapsed(false);
              }}
              className={`flex-1 h-9 flex items-center justify-center gap-1.5 text-[11px] font-medium uppercase tracking-wider transition-colors relative ${
                isActive
                  ? "text-cyan-400"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
              title={tab.label}
            >
              <Icon size={14} />
              <span className="hidden sm:inline">{tab.label}</span>
              {isActive && (
                <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-cyan-400 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {!isCollapsed && (
        <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 390px)" }}>
          <Suspense fallback={<TabLoader />}>
            {activeTab === "search" && <SearchTab />}
            {activeTab === "pathfinder" && <PathfinderTab />}
            {activeTab === "cypher" && <CypherTab />}
          </Suspense>
        </div>
      )}
    </div>
  );
}
