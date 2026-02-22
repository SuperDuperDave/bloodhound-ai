import { create } from "zustand";
import type { EnvironmentStats } from "@/types";

interface EnvironmentState {
  stats: EnvironmentStats | null;
  loading: boolean;
  error: string | null;

  setStats: (stats: EnvironmentStats) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useEnvironmentStore = create<EnvironmentState>((set) => ({
  stats: null,
  loading: true,
  error: null,

  setStats: (stats) => set({ stats, loading: false, error: null }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
}));
