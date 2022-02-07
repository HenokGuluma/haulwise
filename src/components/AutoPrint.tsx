"use client";

import { useEffect } from "react";

/** Fires window.print() once the page (and its images) have painted. */
export function AutoPrint() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 300);
    return () => clearTimeout(t);
  }, []);
  return null;
}
