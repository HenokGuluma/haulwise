import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "./login-form";
import { AuthHero, AuthFormBrand, BackHomeLink } from "@/components/AuthHero";

export const metadata: Metadata = { title: "Sign In" };

export default function LoginPage() {
  return (
    <div className="auth-page">
      <AuthHero />

      <div className="auth-form-panel">
        <BackHomeLink />
        <div className="auth-form-card">
          <AuthFormBrand />
          <div className="auth-form-header">
            <div className="auth-form-title">Welcome back</div>
            <div className="auth-form-sub">Sign in to your dispatch workspace.</div>
          </div>

          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
