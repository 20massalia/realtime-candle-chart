import { create } from "zustand";

type UiState = {
  /** When true, GBM producer stops enqueueing ticks (chart refs stay as-is). */
  isPaused: boolean;
  setPaused: (isPaused: boolean) => void;
  /** Producer speed multiplier (low-frequency UI state only). */
  speedMultiplier: number;
  setSpeedMultiplier: (speedMultiplier: number) => void;
  chartReady: boolean;
  setChartReady: (chartReady: boolean) => void;
};

export const useUiStore = create<UiState>((set) => ({
  isPaused: false,
  setPaused: (isPaused) => set({ isPaused }),
  speedMultiplier: 1,
  setSpeedMultiplier: (speedMultiplier) => set({ speedMultiplier }),
  chartReady: false,
  setChartReady: (chartReady) => set({ chartReady }),
}));
