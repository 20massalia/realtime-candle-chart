import type { GbmState, Tick } from "./types";

export type GbmParams = {
  /** Log-drift per second (mock; keep near 0 for visibility tuning). */
  mu: number;
  /** Volatility coefficient per √second on log scale. */
  sigma: number;
};

function randomNormal(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export function createGbmState(initialPrice: number): GbmState {
  return { price: initialPrice };
}

/**
 * One GBM step over `dtSeconds` of simulated time.
 * `mu`: drift rate per second on log scale; `sigma`: volatility per √second (Itô).
 */
export function stepGbm(
  state: GbmState,
  nowMs: number,
  dtSeconds: number,
  params: GbmParams,
): { state: GbmState; tick: Tick } {
  const dt = Math.max(1e-9, dtSeconds);
  const z = randomNormal();
  const { mu, sigma } = params;
  const drift = (mu - 0.5 * sigma * sigma) * dt;
  const diffusion = sigma * Math.sqrt(dt) * z;
  const nextPrice = state.price * Math.exp(drift + diffusion);
  return {
    state: { price: nextPrice },
    tick: { ts: nowMs, price: nextPrice },
  };
}
