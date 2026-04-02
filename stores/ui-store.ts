import { create } from "zustand";

type UiState = {
  /** When true, GBM producer stops enqueueing ticks (chart refs stay as-is). */
  isPaused: boolean;
  setPaused: (isPaused: boolean) => void;
  chartReady: boolean;
  setChartReady: (chartReady: boolean) => void;
};

export const useUiStore = create<UiState>((set) => ({
  isPaused: false,
  setPaused: (isPaused) => set({ isPaused }),
  chartReady: false,
  setChartReady: (chartReady) => set({ chartReady }),
}));
