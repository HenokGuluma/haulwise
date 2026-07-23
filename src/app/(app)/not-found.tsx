import { Icon, Button } from "@/components/ui";

export default function AppNotFound() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 20px", textAlign: "center" }}>
      <Icon name="package" size={34} style={{ color: "var(--muted)", marginBottom: 14 }} />
      <h2 style={{ margin: "0 0 6px 0", fontFamily: "var(--font-heading)" }}>Not found</h2>
      <p style={{ color: "var(--muted)", fontSize: 13.5, maxWidth: 420, marginBottom: 20 }}>
        This record doesn&apos;t exist — it may have been deleted, or the link is out of date.
      </p>
      <a href="/dashboard"><Button variant="primary">Back to Dashboard</Button></a>
    </div>
  );
}
