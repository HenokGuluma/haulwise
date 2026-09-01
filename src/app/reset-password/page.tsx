import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthHero, AuthFormBrand } from "@/components/AuthHero";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Set New Password" };

export default function ResetPasswordPage() {
  return (
    <div className="auth-page">
      <AuthHero />

      <div className="auth-form-panel">
        <div className="auth-form-card">
          <AuthFormBrand />
          <div className="auth-form-header">
            <div className="auth-form-title">Set a new password</div>
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
