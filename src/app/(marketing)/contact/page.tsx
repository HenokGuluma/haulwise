import type { Metadata } from "next";
import { Icon } from "@/components/ui";

export const metadata: Metadata = { title: "Contact" };

// TODO: swap in the real phone/email/address before this goes live.
const CONTACT = {
  email: "info@coberfreight.com.et",
  phone: "+251 XX XXX XXXX",
  address: "Addis Ababa, Ethiopia",
};

export default function ContactPage() {
  return (
    <section className="mkt-section mkt-content" style={{ maxWidth: 640 }}>
      <h1 style={{ fontSize: 32, marginBottom: 14 }}>Get in touch</h1>
      <p style={{ marginBottom: 36 }}>
        Have a load to move, a question about the platform, or need help with your account? Reach out —
        we&apos;ll get back to you.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <a href={`mailto:${CONTACT.email}`} className="mkt-card" style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span className="mkt-card-icon" style={{ marginBottom: 0 }}><Icon name="mail" size={19} /></span>
          <div>
            <div className="mkt-card-title" style={{ marginBottom: 2 }}>Email</div>
            <div className="mkt-card-desc">{CONTACT.email}</div>
          </div>
        </a>
        <a href={`tel:${CONTACT.phone.replace(/\s/g, "")}`} className="mkt-card" style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span className="mkt-card-icon" style={{ marginBottom: 0 }}><Icon name="phone" size={19} /></span>
          <div>
            <div className="mkt-card-title" style={{ marginBottom: 2 }}>Phone</div>
            <div className="mkt-card-desc">{CONTACT.phone}</div>
          </div>
        </a>
        <div className="mkt-card" style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span className="mkt-card-icon" style={{ marginBottom: 0 }}><Icon name="mapPin" size={19} /></span>
          <div>
            <div className="mkt-card-title" style={{ marginBottom: 2 }}>Location</div>
            <div className="mkt-card-desc">{CONTACT.address}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
