import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { SITE_URL } from "@/lib/site";
const display = localFont({
  src: "../../node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-700-normal.woff2",
  variable: "--font-display",
  display: "swap",
});
const body = localFont({
  src: [
    {
      path: "../../node_modules/@fontsource/barlow/files/barlow-latin-400-normal.woff2",
      weight: "400",
    },
    {
      path: "../../node_modules/@fontsource/barlow/files/barlow-latin-600-normal.woff2",
      weight: "600",
    },
    {
      path: "../../node_modules/@fontsource/barlow/files/barlow-latin-700-normal.woff2",
      weight: "700",
    },
  ],
  variable: "--font-body",
  display: "swap",
});
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Play with Jev — Your next friendly rival",
  description:
    "A little arcade with a clever opponent. Play Heist, Chess, and Minesweeper with TypeSafe Jev, powered by Vercel AI Gateway. Made by Hussain Fakhruddin.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable}`}>{children}</body>
    </html>
  );
}
