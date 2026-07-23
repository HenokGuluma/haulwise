export default function RootNotFound() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20, textAlign: "center", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <h2 style={{ margin: "0 0 6px 0" }}>Page not found</h2>
      <p style={{ color: "#6B7280", fontSize: 13.5, maxWidth: 420, marginBottom: 20 }}>
        This page doesn&apos;t exist or the link is out of date.
      </p>
      <a
        href="/dashboard"
        style={{ background: "#6D5EF5", color: "#fff", textDecoration: "none", borderRadius: 10, padding: "9px 16px", fontSize: 13, fontWeight: 600 }}
      >
        Back to Dashboard
      </a>
    </div>
  );
}
