"use client";

import { navigationItems, siteConfig } from "@/lib/site-config";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { ButtonLink } from "@/components/ui/button-link";
import Image from "next/image";
import Link from "next/link";

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 16);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) {
        setMenuOpen(false);
      }
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const solid = scrolled || menuOpen || pathname !== "/";

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 text-white sm:px-5 sm:pt-4">
      <a
        className="text-night absolute top-3 left-3 z-50 -translate-y-24 rounded-full bg-[#f3efe6] px-4 py-3 text-sm font-bold transition-transform focus:translate-y-0"
        href="#konten-utama"
      >
        Lewati ke konten utama
      </a>
      <div className="mx-auto w-full max-w-6xl">
        <div
          className={`relative mx-auto flex items-center justify-between gap-3 border px-4 py-2.5 backdrop-blur-2xl transition-[background-color,border-color,border-radius,box-shadow] duration-500 sm:px-5 ${
            menuOpen ? "rounded-3xl" : "rounded-full"
          } ${
            solid
              ? "shadow-float border-white/20 bg-[#071529]/78"
              : "border-white/25 bg-white/12"
          }`}
        >
          <Link
            className="flex shrink-0 items-center gap-2.5 text-white"
            href="/"
          >
            <span className="hidden overflow-hidden rounded-sm bg-white px-1 py-0.5 sm:block">
              <Image
                alt="Universitas Budi Luhur dan Fakultas Teknologi Informasi"
                height={28}
                src="/images/ubl-fti-lockup.png"
                width={77}
              />
            </span>
            <span className="font-display text-[1.35rem] tracking-tight italic sm:text-[1.65rem]">
              {siteConfig.name}
            </span>
          </Link>

          <nav
            aria-label="Navigasi utama"
            className="hidden items-center gap-0.5 lg:flex"
          >
            {navigationItems.map((item) => (
              <Link
                className="nav-link rounded-full px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
            <ButtonLink
              className="ml-2 rounded-full"
              href={siteConfig.trackingPath}
              variant="light-outline"
            >
              Lacak Aspirasi
            </ButtonLink>
            <ButtonLink
              className="ml-1 rounded-full"
              href={siteConfig.reportPath}
              variant="light"
            >
              Kirim Aspirasi
            </ButtonLink>
          </nav>

          <div className="mobile-only relative ml-auto flex shrink-0">
            <button
              aria-controls="menu-seluler"
              aria-expanded={menuOpen}
              className="flex min-h-11 items-center justify-center rounded-full border border-white/35 bg-white/10 px-4 text-sm font-bold text-white hover:bg-white/15"
              onClick={() => setMenuOpen((open) => !open)}
              type="button"
            >
              {menuOpen ? "Tutup" : "Menu"}
            </button>
          </div>
        </div>
        {menuOpen ? (
          <nav
            aria-label="Navigasi utama versi mobile"
            className="bg-night/92 shadow-float mt-2 grid gap-1 rounded-3xl border border-white/15 p-3 backdrop-blur-2xl lg:hidden"
            id="menu-seluler"
          >
            {navigationItems.map((item) => (
              <Link
                className="rounded-full px-4 py-3 text-sm font-semibold text-slate-100 hover:bg-white/10"
                href={item.href}
                key={item.href}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <ButtonLink
              className="mt-1 rounded-full"
              href={siteConfig.trackingPath}
              onClick={() => setMenuOpen(false)}
              variant="light-outline"
            >
              Lacak Aspirasi
            </ButtonLink>
            <ButtonLink
              className="rounded-full"
              href={siteConfig.reportPath}
              onClick={() => setMenuOpen(false)}
              variant="light"
            >
              Kirim Aspirasi
            </ButtonLink>
          </nav>
        ) : null}
      </div>
    </header>
  );
}
