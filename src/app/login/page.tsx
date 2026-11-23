import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "./login-form";
import { AuthHero, AuthFormBrand, BackHomeLink } from "@/components/AuthHero";

// Rendered per request rather than prerendered: a prerendered page is sent
// with a year-long s-maxage, and some phone browsers kept serving a stale
// copy of these pages after a deploy. Per-request pages are sent no-store.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Sign In" };

export default function LoginPage() {
  return (
    <div className="auth-page">
      <AuthFormBrand />
      <AuthHero />

      <div className="auth-form-panel">
        <BackHomeLink />
        <div className="auth-form-card">
          <div className="auth-form-header">
            <h1 className="auth-form-title">Welcome back</h1>
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
