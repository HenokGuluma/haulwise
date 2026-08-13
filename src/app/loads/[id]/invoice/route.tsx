import { NextRequest, NextResponse } from "next/server";
import { Document, Page, View, Text, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { fmtMoney, fmtWeight, fmtDate } from "@/lib/format";
import { demoScope } from "@/lib/demo-scope";
import { customerScope } from "@/lib/customer-scope";
import { RATE_TYPE_META, rateBasisQuantity } from "@/lib/rate-calc";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10.5, color: "#12172B", fontFamily: "Helvetica" },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", borderBottomWidth: 2, borderBottomColor: "#12172B", paddingBottom: 14, marginBottom: 20 },
  brand: { fontSize: 18, fontWeight: 700 },
  brandSub: { fontSize: 9.5, color: "#6B7280", marginTop: 2 },
  meta: { fontSize: 9.5, color: "#6B7280", textAlign: "right" },
  metaLine: { marginBottom: 2 },
  billToLabel: { fontSize: 8.5, textTransform: "uppercase", letterSpacing: 0.5, color: "#6B7280", fontWeight: 700, marginBottom: 4 },
  billToName: { fontWeight: 700, marginBottom: 2 },
  billToLine: { color: "#374151", marginBottom: 1 },
  table: { marginTop: 20, borderTopWidth: 1, borderTopColor: "#E4E7ED" },
  tableHeadRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#E4E7ED", paddingVertical: 6 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#EEF0F4", paddingVertical: 10 },
  thDesc: { flex: 3, fontSize: 8.5, textTransform: "uppercase", color: "#6B7280" },
  thRoute: { flex: 2, fontSize: 8.5, textTransform: "uppercase", color: "#6B7280" },
  thAmt: { flex: 1, fontSize: 8.5, textTransform: "uppercase", color: "#6B7280", textAlign: "right" },
  tdDesc: { flex: 3 },
  tdRoute: { flex: 2 },
  tdAmt: { flex: 1, textAlign: "right" },
  basisNote: { fontSize: 8.5, color: "#6B7280", marginTop: 3 },
  total: { flexDirection: "row", justifyContent: "flex-end", marginTop: 16, fontSize: 13, fontWeight: 700 },
  footer: { marginTop: 40, fontSize: 8.5, color: "#6B7280" },
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const load = await prisma.load.findUnique({
    where: { id: params.id, ...demoScope(user), ...customerScope(user) },
    include: { customer: true },
  });
  if (!load) notFound();

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
    <Document title={`Invoice — ${load.loadNumber}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.head}>
          <View>
            <Text style={styles.brand}>Cober Freight</Text>
            <Text style={styles.brandSub}>Freight Dispatch</Text>
          </View>
          <View style={styles.meta}>
            <Text style={styles.metaLine}>Invoice #{load.loadNumber}</Text>
            <Text style={styles.metaLine}>Date: {fmtDate(new Date().toISOString())}</Text>
            <Text style={styles.metaLine}>Delivery: {fmtDate(load.deliveryTime.toISOString())}</Text>
          </View>
        </View>

        <Text style={styles.billToLabel}>Bill To</Text>
        {load.customer ? (
          <View>
            <Text style={styles.billToName}>{load.customer.companyName}</Text>
            <Text style={styles.billToLine}>{load.customer.contactName}</Text>
            <Text style={styles.billToLine}>{load.customer.email} · {load.customer.phone}</Text>
          </View>
        ) : (
          <Text style={{ color: "#6B7280" }}>Customer record no longer on file.</Text>
        )}

        <View style={styles.table}>
          <View style={styles.tableHeadRow}>
            <Text style={styles.thDesc}>Description</Text>
            <Text style={styles.thRoute}>Route</Text>
            <Text style={styles.thAmt}>Amount</Text>
          </View>
          <View style={styles.tableRow}>
            <View style={styles.tdDesc}>
              <Text>Freight — {load.commodity} ({fmtWeight(load.weight)}, {load.equipmentTypeCode})</Text>
              {rateBasisText && <Text style={styles.basisNote}>{rateBasisText}</Text>}
            </View>
            {/* The base-14 Helvetica PDF font only covers WinAnsiEncoding
                (roughly Latin-1) — a → arrow isn't in that set and
                silently renders as the wrong glyph, unlike the em-dash/
                middle-dot used elsewhere here, which are. "to" avoids the
                risk entirely rather than embedding a Unicode font just
                for one character. */}
            <Text style={styles.tdRoute}>{load.origin} to {load.destination}</Text>
            <Text style={styles.tdAmt}>{fmtMoney(load.rate)}</Text>
          </View>
        </View>

        <View style={styles.total}>
          <Text>Total Due: {fmtMoney(load.rate)}</Text>
        </View>

        <Text style={styles.footer}>
          Remit payment referencing invoice #{load.loadNumber}. Questions? Contact your Cober Freight dispatcher.
        </Text>
      </Page>
    </Document>
  );

  const buffer = await renderToBuffer(doc);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${load.loadNumber}-invoice.pdf"`,
    },
  });
}
