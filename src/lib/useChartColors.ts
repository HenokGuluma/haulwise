"use client";

import { useEffect, useState } from "react";

const VARS = [
  "--accent", "--accent-bg", "--success", "--amber", "--amber-ink", "--route", "--purple",
  "--danger", "--slate", "--navy-status", "--ink", "--ink-soft", "--muted",
  "--line", "--line-soft", "--surface-raised",
] as const;

export type ChartColors = Record<(typeof VARS)[number], string>;

/**
 * Resolves the app's CSS custom properties to concrete color strings so
 * recharts (which doesn't reliably resolve var() inside SVG fill/stroke in
 * every browser) always renders the right hue, and re-reads them whenever
 * the theme toggle flips `data-theme` on <html>.
 */
export function useChartColors(): ChartColors {
  const [colors, setColors] = useState<ChartColors>(() => {
    const fallback = {} as ChartColors;
    for (const v of VARS) fallback[v] = "#8884d8";
    return fallback;
  });

  useEffect(() => {
    function read() {
      const style = getComputedStyle(document.documentElement);
      const next = {} as ChartColors;
      for (const v of VARS) next[v] = style.getPropertyValue(v).trim() || "#8884d8";
      setColors(next);
    }
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return colors;
}
