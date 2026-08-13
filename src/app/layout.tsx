import type { Metadata, Viewport } from "next";
import { Inter, Manrope, Montserrat, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700", "800"],
});

// Bold, standard, modern — used for headings, nav, KPI values, and anywhere
// that should read as confidently "designed" without being quirky.
const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["600", "700", "800"],
});

// Heavy geometric grotesque for the Cober Freight wordmark — matches the
// weight/proportions of the logo lettering.
const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-wordmark",
  weight: ["700", "800", "900"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "Cober Freight · Dispatch",
    template: "%s · Cober Freight",
  },
  description: "Freight dispatching platform",
  icons: {
    icon:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='22' fill='%2316264A'/%3E%3Cpath d='M62 28 A24 24 0 1 0 62 72' fill='none' stroke='%234B9FE8' stroke-width='12' stroke-linecap='round'/%3E%3Cpath d='M26 78 Q49 66 80 76' fill='none' stroke='%23E8781E' stroke-width='6' stroke-linecap='round'/%3E%3Cpath d='M57 30 H82 M57 30 V72 M57 50 H76' fill='none' stroke='%23FFFFFF' stroke-width='11' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E",
  },
};

// Without this, mobile browsers fall back to a ~980px virtual viewport and
// scale the desktop layout down instead of reflowing it, which makes every
// max-width media query in globals.css unreliable on real phones.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// Runs before hydration so the correct theme is applied on first paint —
// avoids a flash of the wrong theme when the stored/system preference is dark.
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('haulwise-theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${manrope.variable} ${montserrat.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
