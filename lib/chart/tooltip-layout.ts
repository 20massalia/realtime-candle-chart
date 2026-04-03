export type TooltipSizeCache = {
  width: number;
  height: number;
};

/**
 * Reads tooltip size from `measure` only until width is first cached (>0).
 * Matches CandleChart crosshair tooltip behavior (stable size across moves).
 */
export function readTooltipSizeOnce(
  cache: TooltipSizeCache,
  measure: () => { width: number; height: number },
): { width: number; height: number } {
  if (!cache.width) {
    const s = measure();
    cache.width = s.width;
    cache.height = s.height;
  }
  return { width: cache.width, height: cache.height };
}

export function computeTooltipPosition(opts: {
  containerWidth: number;
  containerHeight: number;
  pointerX: number;
  pointerY: number;
  tooltipWidth: number;
  tooltipHeight: number;
}): { left: number; top: number } {
  const { containerWidth, containerHeight, pointerX, pointerY } = opts;
  const ttW = opts.tooltipWidth;
  const ttH = opts.tooltipHeight;

  let left = pointerX + 16;
  if (left + ttW > containerWidth - 4) left = pointerX - ttW - 16;
  left = Math.max(4, left);

  let top = pointerY - ttH / 2;
  top = Math.max(4, Math.min(top, containerHeight - ttH - 4));

  return { left, top };
}
