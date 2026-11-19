# Landing page revamp: single page with one login button

How to turn the platform's public site (`src/app/(marketing)/`) into one
landing page in the same style as the refreshed coberfreight.com.et site,
with an obvious **Log in** button (or **Go to dashboard** when the visitor
is already signed in). The About and Guide pages go away.

This is the page customers land on from the "Customer login" buttons on
coberfreight.com.et, so it should look like the same company and get them
to the login form in one click.

## What's there today

| Route | File | Fate |
|---|---|---|
| `/` | `src/app/(marketing)/page.tsx` (hero, six feature cards, CTA band) | **Rewrite** as the single landing page |
| `/about` | `src/app/(marketing)/about/page.tsx` | **Delete** |
| `/guide` | `src/app/(marketing)/guide/page.tsx` + `public/guide/*.png` | **Delete** |
| nav | `src/components/marketing/MarketingNav.tsx` (Home / About / Guide + Login) | Simplify to logo + one button |
| footer | `src/components/marketing/MarketingFooter.tsx` (About / Guide / Login links) | Simplify to one line |

> **There is no contact page in this project.** The only screens besides
> the landing page are About and Guide. These steps remove both. If
> "contact" meant something else (for example a phone number shown on
> the login page), check that separately.

Nothing else links to `/about` or `/guide` except `src/middleware.ts`,
`README.md` and `AGENTS.md`. All three are covered below.

## Before you start

1. You have **uncommitted changes** in `login-form.tsx`,
   `forgot-password-form.tsx`, `reset-password-form.tsx`, `LoadsView.tsx`
   and `LoadFormModal.tsx`. Commit or stash them first so this work stays
   separate.
2. Create a branch: `git checkout -b landing-revamp`.
3. Copy these three assets over from the website repo
   (`../Cober-Website/public/`):

   ```bash
   mkdir -p public/landing
   cp ../Cober-Website/public/photos/hero-highway.jpg public/landing/
   cp ../Cober-Website/public/logo-mark.png public/       # navy "F", for light backgrounds
   cp ../Cober-Website/public/logo-mark-light.png public/ # original colours, for navy
   ```

## Step 1: Remove About and Guide

```bash
git rm -r "src/app/(marketing)/about" "src/app/(marketing)/guide" public/guide
```

In `src/middleware.ts`, take them out of the public routes:

```ts
const PUBLIC_ROUTES = new Set(["/", "/forgot-password", "/reset-password"]);
```

**Add redirects for old links.** Without these, a logged-out visitor with
an old `/about` bookmark gets sent to `/login?next=/about` and lands on a
404 after signing in. In `next.config.mjs`:

```js
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: "/about", destination: "/", permanent: false },
      { source: "/guide", destination: "/", permanent: false },
    ];
  },
};
```

Next applies these redirects before middleware runs, so they work whether
or not the visitor is signed in. Use `permanent: false` until you're sure
those URLs won't be reused.

## Step 2: Simplify the nav and footer

`src/components/marketing/MarketingNav.tsx`: drop the `LINKS` array and
`usePathname`, so it no longer needs `"use client"`:

```tsx
import Link from "next/link";
import Image from "next/image";

// Logo plus a single action. The landing page is the whole public site,
// so there is nothing else to navigate to.
export function MarketingNav({ loggedIn }: { loggedIn: boolean }) {
  return (
    <header className="lp-nav">
      <Link href="/" className="lp-logo" aria-label="Cober Freight, home">
        <Image src="/logo-mark-light.png" alt="" width={224} height={160} priority className="lp-logo-mark" />
        <span className="lp-logo-word" aria-hidden="true">
          <span>Cober</span> Freight
        </span>
      </Link>
      <Link href={loggedIn ? "/dashboard" : "/login"} className="lp-btn lp-btn-sm">
        {loggedIn ? "Go to dashboard" : "Log in"}
      </Link>
    </header>
  );
}
```

The wordmark is live text (Montserrat 800), the same approach as the
website. `--font-wordmark` is already loaded in `src/app/layout.tsx`, so
no font changes are needed.

`src/components/marketing/MarketingFooter.tsx`:

```tsx
export function MarketingFooter() {
  return (
    <footer className="lp-footer">
      <p>© {new Date().getFullYear()} Cober Business PLC. All rights reserved.</p>
      <a href="https://coberfreight.com.et">coberfreight.com.et</a>
    </footer>
  );
}
```

`src/app/(marketing)/layout.tsx` can stay as it is. It already looks up
the session and passes `loggedIn` to the nav. Only the wrapper class
changes: `mkt-page` → `lp-page`.

## Step 3: Rewrite the landing page

`src/app/(marketing)/page.tsx`. One screen: a darkened photo, a headline,
one big primary button, and three short points about what customers can
do once signed in.

```tsx
import Image from "next/image";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { Icon } from "@/components/ui";

const POINTS = [
  { icon: "route", text: "Follow every load from assignment to delivery" },
  { icon: "fileText", text: "BOLs, PODs and rate confirmations in one place" },
  { icon: "download", text: "Download invoices as ready-to-send PDFs" },
];

export default async function HomePage() {
  // The layout already reads the session for the nav; reading it here too
  // keeps this page's button in sync without prop-drilling through the layout.
  const user = await getSessionUser();

  return (
    <main className="lp-hero">
      <Image src="/landing/hero-highway.jpg" alt="" fill priority sizes="100vw" quality={60} className="lp-hero-photo" />
      <div className="lp-hero-inner">
        <span className="lp-eyebrow">Customer & dispatch portal</span>
        <h1>
          Your loads, statuses and paperwork, <span>in one place.</span>
        </h1>
        <p className="lp-lead">
          Sign in to see where your cargo is, download your documents and keep track of every invoice.
        </p>

        <div className="lp-actions">
          {user ? (
            <Link href="/dashboard" className="lp-btn lp-btn-lg">
              Go to dashboard <Icon name="arrowRight" size={18} />
            </Link>
          ) : (
            <>
              <Link href="/login" className="lp-btn lp-btn-lg">
                Log in <Icon name="arrowRight" size={18} />
              </Link>
              <Link href="/forgot-password" className="lp-link">Forgot your password?</Link>
            </>
          )}
        </div>

        <ul className="lp-points">
          {POINTS.map((p) => (
            <li key={p.text}>
              <Icon name={p.icon} size={18} />
              {p.text}
            </li>
          ))}
        </ul>

        <p className="lp-note">
          Not a customer yet? <a href="https://coberfreight.com.et/quote">Request a quote</a>. Portal access
          comes with your first booked load.
        </p>
      </div>
    </main>
  );
}
```

Copy notes:
- The headline and points are placeholders written for customers. Dispatch
  staff use the same page, so adjust the wording if staff are the main
  audience.
- Keep it to one primary button. "Forgot your password?" and "Request a
  quote" are deliberately plain text links so they don't compete with it.
- Don't add stats or testimonials. The website deliberately has none (see
  the website's NOTES.md).

## Step 4: Styles

In `src/app/globals.css`, delete the whole **MARKETING SITE** block, from
the comment above `.mkt-page` (around line 1010) to the end of the file,
around line 1119. Before deleting, run
`grep -rn "mkt-" src`. After Steps 2–3 the only remaining hit should be
`globals.css` itself; the auth pages have their own `.auth-*` classes.

Then paste this in its place. It uses the website's colours and spacing
(navy #131B2E, orange #E8781E for the one primary button, with navy text
because white on that orange fails contrast).

> **Don't restyle the global `.btn-primary`.** It's the purple accent used
> throughout the logged-in app. The landing page gets its own `.lp-btn`
> class, so nothing inside the app changes.

```css
/* =========================================================================
   LANDING PAGE — the platform's only public page ((marketing) group).
   Matches coberfreight.com.et: navy, darkened photo, one orange action.
   Always dark, independent of the app's light/dark data-theme.
   ========================================================================= */
.lp-page {
  --lp-navy: #131b2e;
  --lp-navy-900: #0c1220;
  --lp-ink: #c9d2ea;
  --lp-orange: #e8781e;
  --lp-orange-600: #d2680f;
  --lp-sky: #4b9fe8;
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--lp-navy);
  color: var(--lp-ink);
}

.lp-nav,
.lp-footer {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 clamp(16px, 4vw, 32px);
}

.lp-nav { height: 72px; }

.lp-logo { display: inline-flex; align-items: center; gap: 10px; min-height: 44px; text-decoration: none; }
.lp-logo-mark { height: 32px; width: auto; }
.lp-logo-word {
  font-family: var(--font-wordmark), sans-serif;
  font-weight: 800;
  font-size: clamp(17px, 2.4vw, 24px);
  letter-spacing: -0.01em;
  text-transform: uppercase;
  white-space: nowrap;
  color: #fff;
}
.lp-logo-word span { color: var(--lp-sky); }

.lp-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 48px;
  padding: 0 1.5rem;
  border-radius: 999px;
  background: var(--lp-orange);
  color: var(--lp-navy);
  font-family: var(--font-heading), sans-serif;
  font-weight: 800;
  font-size: 1rem;
  text-decoration: none;
  white-space: nowrap;
  transition: background-color 0.2s ease, box-shadow 0.2s ease;
}
.lp-btn:hover { background: var(--lp-orange-600); color: var(--lp-navy); box-shadow: 0 6px 18px rgba(232, 120, 30, 0.35); }
.lp-btn:focus-visible,
.lp-page a:focus-visible { outline: 3px solid var(--lp-orange); outline-offset: 3px; }
.lp-btn-sm { min-height: 44px; padding: 0 1.1rem; font-size: 0.9rem; }
.lp-btn-lg { min-height: 56px; padding: 0 2rem; font-size: 1.1rem; }

.lp-hero {
  position: relative;
  isolation: isolate;
  flex: 1;
  display: flex;
  align-items: center;
  overflow: hidden;
  margin-top: -72px; /* photo runs behind the nav */
  padding: calc(72px + clamp(48px, 8vw, 96px)) clamp(16px, 4vw, 32px) clamp(48px, 8vw, 96px);
}
.lp-hero-photo { z-index: -2; object-fit: cover; object-position: 60% 50%; }
.lp-hero::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  background:
    radial-gradient(900px 500px at 88% -10%, rgba(62, 147, 224, 0.22), transparent 60%),
    linear-gradient(100deg, rgba(12, 18, 32, 0.96) 0%, rgba(19, 27, 46, 0.88) 50%, rgba(19, 27, 46, 0.64) 100%);
}
.lp-hero-inner { width: 100%; max-width: 1200px; margin: 0 auto; }
.lp-hero-inner > * { max-width: 680px; }

.lp-eyebrow {
  display: inline-block;
  margin-bottom: 0.9rem;
  font-family: var(--font-heading), sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--lp-orange);
}
.lp-hero h1 {
  margin: 0 0 0.5em;
  font-family: var(--font-wordmark), sans-serif;
  font-weight: 800;
  font-size: clamp(2.1rem, 5vw, 3.4rem);
  line-height: 1.12;
  letter-spacing: -0.015em;
  color: #fff;
  text-wrap: balance;
}
.lp-hero h1 span { color: var(--lp-orange); }
.lp-lead { margin: 0 0 2rem; font-size: clamp(1.05rem, 1.6vw, 1.2rem); line-height: 1.6; }

.lp-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 24px; margin-bottom: 2.25rem; }
.lp-link { display: inline-flex; align-items: center; min-height: 44px; color: #fff; font-weight: 600; text-underline-offset: 3px; }
.lp-link:hover { color: var(--lp-orange); }

.lp-points { list-style: none; margin: 0 0 2rem; padding: 0; display: grid; gap: 10px; }
.lp-points li { display: flex; align-items: center; gap: 10px; font-size: 0.97rem; }
.lp-points svg { flex: none; color: var(--lp-sky); }

.lp-note { margin: 0; font-size: 0.9rem; color: #9aa6c4; }
.lp-note a { color: #fff; font-weight: 600; }

.lp-footer {
  flex-wrap: wrap;
  padding-block: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 0.85rem;
  color: #9aa6c4;
  max-width: none;
  background: var(--lp-navy-900);
}
.lp-footer p { margin: 0; }
.lp-footer a { display: inline-flex; align-items: center; min-height: 44px; color: var(--lp-ink); }

@media (max-width: 480px) {
  .lp-actions .lp-btn-lg { width: 100%; }
  .lp-logo-mark { height: 28px; }
}
```

There is no animation on this page. It's one screen, and the website
deliberately dropped its scroll effects for being glitchy.

## Step 5: Update the docs

- `AGENTS.md` (directory map, around line 108): change
  `Public site: landing page, /about, /guide` to
  `Public landing page only (/); /about and /guide redirect to /`.
- `README.md` (around line 113): the same edit.
- The `PUBLIC_ROUTES` comment in `middleware.ts` mentions "re-reading the
  guide"; reword it.

## Step 6: Check it

```bash
npm run typecheck && npm run lint && npm run build && npm run start
```

Then, in a browser:

- [ ] Logged out, `/` shows **Log in** in both the nav and the hero, and
      both go to `/login`.
- [ ] Logged in, `/` shows **Go to dashboard**, which works for a staff
      login and for a customer-portal login. Use the seed accounts from
      AGENTS.md if you have a local DB; a customer-scoped user needs to be
      created via Roles/Users.
- [ ] `/about` and `/guide` redirect to `/`, logged in and logged out.
- [ ] The login page's **Back to home** link (`BackHomeLink` in
      `src/components/AuthHero.tsx`) still lands on the new page.
- [ ] At 360px wide: no horizontal scroll, and the logo and nav button fit
      on one line.
- [ ] Switching the app to dark mode doesn't change the landing page (it's
      always navy).
- [ ] Inside the app, buttons are still purple. If any turned orange, a
      `.lp-` rule leaked or the global `.btn-primary` was edited.
- [ ] Lighthouse mobile on `/`: aim for 90+ Performance, Accessibility and
      Best Practices.
- [ ] From coberfreight.com.et, the header/hero **Customer login** buttons
      land on this page.

## Deploying

The portal runs on the VPS at `dispatch.coberfreight.com.et` (see
`deploy/README.md`), not on the website's Vercel project. Follow that
runbook, and keep the Dockerfile's `next build` retry loop. Removing the
`public/guide` screenshots also makes the image slightly smaller.
