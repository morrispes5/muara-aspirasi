import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Fraunces, Outfit } from "next/font/google";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

import "./globals.css";

const outfit = Outfit({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-outfit",
});

const fraunces = Fraunces({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-fraunces",
});

export const metadata: Metadata = {
  title: {
    default: "Muara Aspirasi",
    template: "%s | Muara Aspirasi",
  },
  description:
    "Ruang aspirasi kampus yang aman, jelas, dan bertanggung jawab untuk mahasiswa.",
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      className={`${outfit.variable} ${fraunces.variable}`}
      data-scroll-behavior="smooth"
      lang="id"
    >
      <body className="flex min-h-screen flex-col antialiased">
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
