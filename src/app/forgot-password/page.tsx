import type { Metadata } from "next";
import { AuthHero, AuthFormBrand, BackHomeLink } from "@/components/AuthHero";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "Reset Password" };

export default function ForgotPasswordPage() {
  return (
    <div className="auth-page">
      <AuthHero />

      <div className="auth-form-panel">
        <BackHomeLink />
        <div className="auth-form-card">
          <AuthFormBrand />
          <div className="auth-form-header">
            <div className="auth-form-title">Reset your password</div>
            <div className="auth-form-sub">Enter your account email and we&apos;ll send a link to reset it.</div>
          </div>

          <ForgotPasswordForm />

          <div style={{ marginTop: 18, textAlign: "center" }}>
            <a href="/login" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--accent)" }}>← Back to sign in</a>
          </div>
        </div>
      </div>
    </div>
  );
}
