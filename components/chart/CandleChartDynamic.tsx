"use client";

import dynamic from "next/dynamic";

export const CandleChartDynamic = dynamic(
  () =>
    import("@/components/chart/CandleChart").then((m) => m.CandleChart),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[min(70vh,560px)] min-h-[320px] w-full items-center justify-center rounded-lg border border-dashed border-zinc-300 text-zinc-500 dark:border-zinc-600 dark:text-zinc-400">
        차트 로딩 중…
      </div>
    ),
  },
);
