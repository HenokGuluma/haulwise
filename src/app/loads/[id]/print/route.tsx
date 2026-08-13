import { NextRequest, NextResponse } from "next/server";
import { Document, Page, View, Text, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { fmtMoney, fmtWeight, fmtDateTime, statusLabel } from "@/lib/format";
import { demoScope } from "@/lib/demo-scope";
import { customerScope } from "@/lib/customer-scope";
import { RATE_TYPE_META, rateBasisQuantity } from "@/lib/rate-calc";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10.5, color: "#12172B", fontFamily: "Helvetica" },
  h1: { fontSize: 16, fontWeight: 700, marginBottom: 2 },
  sub: { fontSize: 9.5, color: "#6B7280", marginBottom: 20 },
  section: { fontSize: 8.5, textTransform: "uppercase", letterSpacing: 0.5, color: "#6B7280", fontWeight: 700, marginTop: 16, marginBottom: 6 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#EEF0F4" },
  label: { color: "#6B7280" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  gridCell: { width: "50%", paddingRight: 16 },
  docs: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  doc: { fontSize: 8.5, borderWidth: 1, borderColor: "#E4E7ED", borderRadius: 4, paddingVertical: 3, paddingHorizontal: 6 },
});

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text>{value}</Text>
    </View>
  );
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const load = await prisma.load.findUnique({
    where: { id: params.id, ...demoScope(user), ...customerScope(user) },
    include: { customer: true, driver: true, equipment: true, documents: { orderBy: { uploadedAt: "desc" } } },
  });
  if (!load) notFound();

  const currentDocs = Object.values(
    load.documents.reduce<Record<string, (typeof load.documents)[number]>>((acc, d) => {
      if (!acc[d.type]) acc[d.type] = d;
      return acc;
    }, {})
  );

  const rateBasisText =
    load.rateType !== "FLAT" && load.rateBasisValue != null
      ? `${RATE_TYPE_META[load.rateType].label}: ${fmtMoney(load.rateBasisValue)} × ${rateBasisQuantity({
          rateType: load.rateType,
          weight: load.weight,
          distanceKm: load.distanceKm,
          pickupTime: load.pickupTime,
          deliveryTime: load.deliveryTime,
        })?.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${
          load.rateType === "PER_QUINTAL" ? "Quintals" : load.rateType === "PER_KM" ? "km" : "hrs"
        }`
      : null;

  const doc = (
    <Document title={`${load.loadNumber} — Dispatch Paper`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>Cober Freight — Dispatch Paper</Text>
        <Text style={styles.sub}>
          {load.loadNumber} · {statusLabel(load.status)} · Generated {fmtDateTime(new Date().toISOString())}
        </Text>

        <Text style={styles.section}>Route</Text>
        <Row label="Origin" value={load.origin} />
        <Row label="Pickup" value={fmtDateTime(load.pickupTime.toISOString())} />
        <Row label="Destination" value={load.destination} />
        <Row label="Delivery" value={fmtDateTime(load.deliveryTime.toISOString())} />

        <Text style={styles.section}>Customer</Text>
        <Row label="Company" value={load.customer?.companyName ?? "Deleted customer"} />
        {load.customer && <Row label="Contact" value={`${load.customer.contactName} · ${load.customer.phone}`} />}

        <Text style={styles.section}>Load Details</Text>
        <View style={styles.grid}>
          <View style={styles.gridCell}><Row label="Commodity" value={load.commodity} /></View>
          <View style={styles.gridCell}><Row label="Weight" value={fmtWeight(load.weight)} /></View>
          <View style={styles.gridCell}><Row label="Equipment" value={load.equipmentTypeCode} /></View>
          <View style={styles.gridCell}><Row label="Rate" value={fmtMoney(load.rate)} /></View>
          {rateBasisText && (
            <View style={{ width: "100%" }}><Row label="Rate basis" value={rateBasisText} /></View>
          )}
        </View>

        <Text style={styles.section}>Assignment</Text>
        <Row label="Driver" value={load.driver ? `${load.driver.firstName} ${load.driver.lastName}` : "Unassigned"} />
        <Row label="Equipment" value={load.equipment ? load.equipment.unitNumber : "Unassigned"} />
        {!user.isCustomerScoped && (
          <Row
            label={`Driver Pay (${
              load.driverPayType === "PERCENTAGE"
                ? `${load.driverPayValue}% of rate`
                : load.driverPayType === "PER_UNIT"
                ? `${fmtMoney(load.driverPayValue)} / ${load.rateType === "PER_QUINTAL" ? "Quintal" : load.rateType === "PER_KM" ? "km" : "hr"}`
                : "fixed"
            })`}
            value={fmtMoney(load.driverPay)}
          />
        )}

        {currentDocs.length > 0 && (
          <>
            <Text style={styles.section}>Documents on file</Text>
            <View style={styles.docs}>
              {currentDocs.map((d) => (
                <Text key={d.id} style={styles.doc}>{d.type.replace("_", " ")}: {d.fileName}</Text>
              ))}
            </View>
          </>
        )}
      </Page>
    </Document>
  );

  const buffer = await renderToBuffer(doc);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${load.loadNumber}-dispatch-paper.pdf"`,
    },
  });
}
