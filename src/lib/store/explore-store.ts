import { create } from "zustand";
import type { ExploreTab, SelectedNode } from "@/types";

interface ExploreState {
  activeTab: ExploreTab;
  isCollapsed: boolean;

  // Pathfinder state (persists across tab switches)
  pathStart: SelectedNode | null;
  pathEnd: SelectedNode | null;

  // Cypher state (persists across tab switches)
  cypherQuery: string;
  queryHistory: string[];

  // Actions
  setActiveTab: (tab: ExploreTab) => void;
  toggleCollapsed: () => void;
  setCollapsed: (collapsed: boolean) => void;
  setPathStart: (node: SelectedNode | null) => void;
  setPathEnd: (node: SelectedNode | null) => void;
  swapPathEndpoints: () => void;
  setCypherQuery: (query: string) => void;
  addToHistory: (query: string) => void;
}

export const useExploreStore = create<ExploreState>((set) => ({
  activeTab: "search",
  isCollapsed: false,
  pathStart: null,
  pathEnd: null,
  cypherQuery: "",
  queryHistory: [],

  setActiveTab: (tab) => set({ activeTab: tab }),

  toggleCollapsed: () => set((s) => ({ isCollapsed: !s.isCollapsed })),

  setCollapsed: (collapsed) => set({ isCollapsed: collapsed }),

  setPathStart: (node) => set({ pathStart: node }),

  setPathEnd: (node) => set({ pathEnd: node }),

  swapPathEndpoints: () =>
    set((s) => ({ pathStart: s.pathEnd, pathEnd: s.pathStart })),

  setCypherQuery: (query) => set({ cypherQuery: query }),

  addToHistory: (query) =>
    set((s) => ({
      queryHistory: [query, ...s.queryHistory.filter((q) => q !== query)].slice(0, 20),
    })),
}));
