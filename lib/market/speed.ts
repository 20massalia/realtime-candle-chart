export const SPEED_PRESETS = [0.5, 1, 2, 5] as const;

export function intervalMsForSpeed(
  baseIntervalMs: number,
  speedMultiplier: number,
): number {
  const safeSpeed = Number.isFinite(speedMultiplier) && speedMultiplier > 0
    ? speedMultiplier
    : 1;
  const ms = Math.round(baseIntervalMs / safeSpeed);
  return Math.max(1, ms);
}
