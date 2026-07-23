"use client";

import { useEffect } from "react";

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20, textAlign: "center", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <h2 style={{ margin: "0 0 6px 0" }}>Something went wrong</h2>
      <p style={{ color: "#6B7280", fontSize: 13.5, maxWidth: 420, marginBottom: 20 }}>
        This page hit an unexpected error. It&apos;s been logged.
      </p>
      <button
        onClick={reset}
        style={{ background: "#6D5EF5", color: "#fff", border: "none", borderRadius: 10, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
      >
        Try again
      </button>
    </div>
  );
}
