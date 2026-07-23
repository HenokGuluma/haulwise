import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { fmtMoney, fmtDateTime, statusLabel } from "@/lib/format";
import { AutoPrint } from "@/components/AutoPrint";
import { demoScope } from "@/lib/demo-scope";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const load = await prisma.load.findUnique({ where: { id: params.id }, select: { loadNumber: true } });
  return { title: load ? `${load.loadNumber} — Load Summary` : "Load Summary" };
}

const printStyles = `
  .print-page { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #12172B; max-width: 720px; margin: 40px auto; padding: 0 24px; background: #fff; }
  .print-page h1 { font-size: 20px; margin: 0 0 2px 0; }
  .print-page .sub { color: #6B7280; font-size: 13px; margin-bottom: 24px; }
  .print-page .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #EEF0F4; font-size: 13px; }
  .print-page .row .label { color: #6B7280; }
  .print-page .section { margin-top: 22px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #6B7280; font-weight: 700; margin-bottom: 6px; }
  .print-page .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
  .print-page .docs { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
  .print-page .doc { font-size: 11px; border: 1px solid #E4E7ED; border-radius: 6px; padding: 4px 8px; }
  @media print { .print-page { margin: 0; padding: 16px; } }
`;

export default async function LoadPrintPage({ params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const load = await prisma.load.findUnique({
    where: { id: params.id, ...demoScope(user) },
    include: { customer: true, driver: true, equipment: true, documents: { orderBy: { uploadedAt: "desc" } } },
  });
  if (!load) notFound();

  const currentDocs = Object.values(
    load.documents.reduce<Record<string, (typeof load.documents)[number]>>((acc, d) => {
      if (!acc[d.type]) acc[d.type] = d;
      return acc;
    }, {})
  );

  return (
    <div className="print-page">
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      <AutoPrint />

      <h1>Haulwise — Load Summary</h1>
      <div className="sub">{load.loadNumber} · {statusLabel(load.status)} · Generated {fmtDateTime(new Date().toISOString())}</div>

      <div className="section">Route</div>
      <div className="row"><span className="label">Origin</span><span>{load.origin}</span></div>
      <div className="row"><span className="label">Pickup</span><span>{fmtDateTime(load.pickupTime.toISOString())}</span></div>
      <div className="row"><span className="label">Destination</span><span>{load.destination}</span></div>
      <div className="row"><span className="label">Delivery</span><span>{fmtDateTime(load.deliveryTime.toISOString())}</span></div>

      <div className="section">Customer</div>
      <div className="row"><span className="label">Company</span><span>{load.customer?.companyName ?? "Deleted customer"}</span></div>
      {load.customer && <div className="row"><span className="label">Contact</span><span>{load.customer.contactName} · {load.customer.phone}</span></div>}

      <div className="section">Load Details</div>
      <div className="grid">
        <div className="row"><span className="label">Commodity</span><span>{load.commodity}</span></div>
        <div className="row"><span className="label">Weight</span><span>{load.weight.toLocaleString()} lbs</span></div>
        <div className="row"><span className="label">Equipment</span><span>{load.equipmentTypeCode}</span></div>
        <div className="row"><span className="label">Rate</span><span>{fmtMoney(load.rate)}</span></div>
      </div>

      <div className="section">Assignment</div>
      <div className="row"><span className="label">Driver</span><span>{load.driver ? `${load.driver.firstName} ${load.driver.lastName}` : "Unassigned"}</span></div>
      <div className="row"><span className="label">Equipment</span><span>{load.equipment ? load.equipment.unitNumber : "Unassigned"}</span></div>
      <div className="row"><span className="label">Driver Pay</span><span>{fmtMoney(load.driverPay)}</span></div>

      {currentDocs.length > 0 && (
        <>
          <div className="section">Documents on file</div>
          <div className="docs">
            {currentDocs.map((d) => <span key={d.id} className="doc">{d.type.replace("_", " ")}: {d.fileName}</span>)}
          </div>
        </>
      )}
    </div>
  );
}
