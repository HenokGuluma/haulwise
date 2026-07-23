import type { Metadata } from "next";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700", "800"],
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Haulwise · Dispatch",
  description: "Internal freight dispatching platform",
  icons: {
    icon:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='22' fill='%23131B2E'/%3E%3Cpath d='M20 62h8V40h20l10 12v10h8' stroke='%23F5A623' stroke-width='6' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3Ccircle cx='36' cy='66' r='6' fill='%23F5A623'/%3E%3Ccircle cx='62' cy='66' r='6' fill='%23F5A623'/%3E%3C/svg%3E",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${plexMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
