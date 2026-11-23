import type { Metadata } from "next";
import { AuthHero, AuthFormBrand, BackHomeLink } from "@/components/AuthHero";
import { ForgotPasswordForm } from "./forgot-password-form";

// Rendered per request rather than prerendered: a prerendered page is sent
// with a year-long s-maxage, and some phone browsers kept serving a stale
// copy of these pages after a deploy. Per-request pages are sent no-store.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Reset Password" };

export default function ForgotPasswordPage() {
  return (
    <div className="auth-page">
      <AuthFormBrand />
      <AuthHero />

      <div className="auth-form-panel">
        <BackHomeLink />
        <div className="auth-form-card">
          <div className="auth-form-header">
            <h1 className="auth-form-title">Reset your password</h1>
            <div className="auth-form-sub">Enter your account email and we&apos;ll send a link to reset it.</div>
          </div>

          <ForgotPasswordForm />

          <div className="auth-alt-row">
            <a href="/login" className="auth-text-link">← Back to sign in</a>
          </div>
        </div>
      </div>
    </div>
  );
}
