export default function Loading() {
  return (
    <div className="card" style={{ padding: 20, maxWidth: 640 }}>
      <div className="skel" style={{ width: "30%", height: 16, marginBottom: 16 }} />
      <div className="skel" style={{ width: "100%", height: 60, borderRadius: 10 }} />
    </div>
  );
}
