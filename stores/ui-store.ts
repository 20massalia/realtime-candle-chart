import { create } from "zustand";

type UiState = {
  /** When true, the chart does not apply live stream events (socket stays open). */
  isPaused: boolean;
  setPaused: (isPaused: boolean) => void;
  /** Speed preset UI only; server tick interval is fixed. */
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
