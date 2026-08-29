export const navigationItems = [
  { href: "/", label: "Beranda" },
  { href: "/update", label: "Update Advokasi" },
  { href: "/info-mahasiswa", label: "Info Mahasiswa" },
  { href: "/tentang", label: "Tentang" },
] as const;

export const siteConfig = {
  name: "Muara Aspirasi",
  purpose:
    "Ruang informasi dan aspirasi mahasiswa BEM FTI Universitas Budi Luhur.",
  bemSignInPath: "/masuk",
  reportPath: "/aspirasi/kirim",
  trackingPath: "/aspirasi/lacak",
} as const;
