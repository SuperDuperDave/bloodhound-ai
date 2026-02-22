import { create } from "zustand";
import type { ContextChip, RemediationItem } from "@/types";

interface ChatState {
  contextChips: ContextChip[];
  remediationItems: RemediationItem[];

  addContextChip: (chip: ContextChip) => void;
  removeContextChip: (objectId: string) => void;
  clearContextChips: () => void;

  addRemediationItem: (item: RemediationItem) => void;
  removeRemediationItem: (id: string) => void;
  clearRemediationItems: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  contextChips: [],
  remediationItems: [],

  addContextChip: (chip) =>
    set((state) => {
      if (state.contextChips.some((c) => c.objectId === chip.objectId)) {
        return state;
      }
      return { contextChips: [...state.contextChips, chip] };
    }),

  removeContextChip: (objectId) =>
    set((state) => ({
      contextChips: state.contextChips.filter((c) => c.objectId !== objectId),
    })),

  clearContextChips: () => set({ contextChips: [] }),

  addRemediationItem: (item) =>
    set((state) => ({
      remediationItems: [...state.remediationItems, item],
    })),

  removeRemediationItem: (id) =>
    set((state) => ({
      remediationItems: state.remediationItems.filter((r) => r.id !== id),
    })),

  clearRemediationItems: () => set({ remediationItems: [] }),
}));
