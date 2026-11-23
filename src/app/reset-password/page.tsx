import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthHero, AuthFormBrand, BackHomeLink } from "@/components/AuthHero";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Set New Password" };

export default function ResetPasswordPage() {
  return (
    <div className="auth-page">
      <AuthFormBrand />
      <AuthHero />

      <div className="auth-form-panel">
        <BackHomeLink />
        <div className="auth-form-card">
          <div className="auth-form-header">
            <h1 className="auth-form-title">Set a new password</h1>
            <div className="auth-form-sub">Choose a new password for your account.</div>
          </div>

          <Suspense fallback={null}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
