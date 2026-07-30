import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { fmtMoney, fmtWeight, fmtDate } from "@/lib/format";
import { AutoPrint } from "@/components/AutoPrint";
import { demoScope } from "@/lib/demo-scope";
import { customerScope } from "@/lib/customer-scope";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const load = await prisma.load.findUnique({ where: { id: params.id }, select: { loadNumber: true } });
  return { title: load ? `Invoice — ${load.loadNumber}` : "Invoice" };
}

const invoiceStyles = `
  .invoice-page { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #12172B; max-width: 680px; margin: 40px auto; padding: 0 24px; background: #fff; }
  .invoice-head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #12172B; padding-bottom: 16px; margin-bottom: 20px; }
  .invoice-head h1 { font-size: 22px; margin: 0; }
  .invoice-head .meta { text-align: right; font-size: 13px; color: #6B7280; }
  .bill-to { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #6B7280; font-weight: 700; margin-bottom: 4px; }
  table.invoice-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
  table.invoice-table th { text-align: left; font-size: 11px; text-transform: uppercase; color: #6B7280; border-bottom: 1px solid #E4E7ED; padding: 8px 4px; }
  table.invoice-table td { padding: 10px 4px; border-bottom: 1px solid #EEF0F4; font-size: 13px; }
  .invoice-total { display: flex; justify-content: flex-end; margin-top: 16px; font-size: 16px; font-weight: 700; }
  .invoice-footer { margin-top: 40px; font-size: 11px; color: #6B7280; }
  @media print { .invoice-page { margin: 0; padding: 16px; } }
`;

export default async function LoadInvoicePage({ params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const load = await prisma.load.findUnique({
    where: { id: params.id, ...demoScope(user), ...customerScope(user) },
    include: { customer: true },
  });
  if (!load) notFound();

  return (
    <div className="invoice-page">
      <style dangerouslySetInnerHTML={{ __html: invoiceStyles }} />
      <AutoPrint />

      <div className="invoice-head">
        <div>
          <h1>Edget</h1>
          <div style={{ fontSize: 12, color: "#6B7280" }}>Freight Dispatch</div>
        </div>
        <div className="meta">
          <div>Invoice #{load.loadNumber}</div>
          <div>Date: {fmtDate(new Date().toISOString())}</div>
          <div>Delivery: {fmtDate(load.deliveryTime.toISOString())}</div>
        </div>
      </div>

      <div className="bill-to">Bill To</div>
      {load.customer ? (
        <div style={{ fontSize: 13 }}>
          <div style={{ fontWeight: 700 }}>{load.customer.companyName}</div>
          <div>{load.customer.contactName}</div>
          <div>{load.customer.email} · {load.customer.phone}</div>
        </div>
      ) : (
        <div style={{ fontSize: 13, color: "#6B7280" }}>Customer record no longer on file.</div>
      )}

      <table className="invoice-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Route</th>
            <th style={{ textAlign: "right" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Freight — {load.commodity} ({fmtWeight(load.weight)}, {load.equipmentTypeCode})</td>
            <td>{load.origin} → {load.destination}</td>
            <td style={{ textAlign: "right" }}>{fmtMoney(load.rate)}</td>
          </tr>
        </tbody>
      </table>

      <div className="invoice-total">Total Due: {fmtMoney(load.rate)}</div>

      <div className="invoice-footer">
        Remit payment referencing invoice #{load.loadNumber}. Questions? Contact your Edget dispatcher.
      </div>
    </div>
  );
}
