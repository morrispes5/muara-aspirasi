import { navigationItems, siteConfig } from "@/lib/site-config";

import { Container } from "@/components/layout/container";
import Image from "next/image";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="bg-night text-slate-300">
      <Container className="grid gap-10 py-16 md:grid-cols-[1.25fr_1fr]">
        <div className="max-w-md space-y-4">
          <p className="font-display text-3xl tracking-tight text-white italic">
            {siteConfig.name}
          </p>
          <p className="text-sm leading-6 text-slate-300">
            Ruang aspirasi kampus yang dibangun untuk mendengar dengan hormat,
            menindaklanjuti secara bertanggung jawab, dan menjaga privasi
            pelapor.
          </p>
          <p className="text-xs leading-5 text-slate-400">
            Ruang publik untuk mendengar dengan lebih jernih. Angka yang tampil
            tetap berupa contoh, bukan data operasional.
          </p>
          <div className="flex items-center gap-3 pt-2">
            <span className="rounded-md bg-white px-2 py-1.5">
              <Image
                alt="Logo Fakultas Teknologi Informasi"
                height={34}
                src="/images/fti-logo.jpg"
                width={37}
              />
            </span>
            <span className="rounded-md bg-white px-2 py-1.5">
              <Image
                alt="Identitas BEM Fakultas Teknologi Informasi"
                className="h-[34px] w-auto"
                height={399}
                src="/images/bem-fti-mark.png"
                width={403}
              />
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 self-start text-sm">
          {navigationItems.map((item) => (
            <Link
              className="rounded-control hover:border-mist border-b border-transparent py-1 font-semibold hover:text-white"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
          <Link
            className="rounded-control hover:border-mist border-b border-transparent py-1 font-semibold hover:text-white"
            href={siteConfig.reportPath}
          >
            Kirim Aspirasi
          </Link>
          <Link
            className="rounded-control hover:border-mist border-b border-transparent py-1 font-semibold hover:text-white"
            href="/kebijakan-privasi"
          >
            Kebijakan Privasi
          </Link>
          <Link
            className="rounded-control hover:border-mist border-b border-transparent py-1 font-semibold hover:text-white"
            href="/etika-pelaporan"
          >
            Etika Pelaporan
          </Link>
        </div>
      </Container>
    </footer>
  );
}
