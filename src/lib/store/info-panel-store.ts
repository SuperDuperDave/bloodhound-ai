import { create } from "zustand";
import type { ADNodeKind, SelectedEdge } from "@/types";

interface SelectedEntity {
  objectId: string;
  kind: ADNodeKind;
  label: string;
}

interface InfoPanelState {
  isOpen: boolean;
  selectedEntity: SelectedEntity | null;
  selectedEdge: SelectedEdge | null;

  setSelectedEntity: (entity: SelectedEntity) => void;
  setSelectedEdge: (edge: SelectedEdge) => void;
  clearSelection: () => void;
  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;
}

export const useInfoPanelStore = create<InfoPanelState>((set) => ({
  isOpen: false,
  selectedEntity: null,
  selectedEdge: null,

  setSelectedEntity: (entity) =>
    set({ selectedEntity: entity, selectedEdge: null, isOpen: true }),

  setSelectedEdge: (edge) =>
    set({ selectedEdge: edge, selectedEntity: null, isOpen: true }),

  clearSelection: () =>
    set({ selectedEntity: null, selectedEdge: null }),

  togglePanel: () =>
    set((state) => ({ isOpen: !state.isOpen })),

  openPanel: () =>
    set({ isOpen: true }),

  closePanel: () =>
    set({ isOpen: false }),
}));
