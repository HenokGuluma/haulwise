"use client";

import { useEffect } from "react";
import { Icon, Button } from "@/components/ui";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 20px", textAlign: "center" }}>
      <Icon name="alertTriangle" size={34} style={{ color: "var(--danger)", marginBottom: 14 }} />
      <h2 style={{ margin: "0 0 6px 0", fontFamily: "var(--font-heading)" }}>Something went wrong</h2>
      <p style={{ color: "var(--muted)", fontSize: 13.5, maxWidth: 420, marginBottom: 20 }}>
        This part of the page hit an unexpected error. It&apos;s been logged — try again, or head back to the dashboard.
      </p>
      <div style={{ display: "flex", gap: 10 }}>
        <Button variant="primary" icon="refresh" onClick={reset}>Try again</Button>
        <a href="/dashboard"><Button variant="ghost">Back to Dashboard</Button></a>
      </div>
    </div>
  );
}
