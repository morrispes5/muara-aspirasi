export type PublicArticle = {
  category: string;
  date: string;
  excerpt: string;
  readTime: string;
  slug: string;
  title: string;
};

export const advocacyUpdates: readonly PublicArticle[] = [
  {
    category: "Laboratorium komputer",
    date: "Contoh tanggal",
    excerpt:
      "Contoh pembaruan yang menjelaskan koordinasi BEM tanpa menyebut pelapor atau detail laporan privat.",
    readTime: "Contoh 3 menit baca",
    slug: "contoh-koordinasi-laboratorium",
    title: "Contoh: koordinasi kenyamanan laboratorium",
  },
  {
    category: "Fasilitas kampus",
    date: "Contoh tanggal",
    excerpt:
      "Ringkasan publik harus membedakan fakta yang sudah terverifikasi, tindakan BEM, dan langkah berikutnya.",
    readTime: "Contoh 2 menit baca",
    slug: "contoh-perbaikan-fasilitas",
    title: "Contoh: pembaruan fasilitas belajar",
  },
] as const;

export const studentInfoPosts: readonly PublicArticle[] = [
  {
    category: "Akademik",
    date: "Contoh tanggal",
    excerpt:
      "Ruang untuk informasi terverifikasi yang relevan bagi mahasiswa, seperti layanan dan pengumuman akademik.",
    readTime: "Contoh 2 menit baca",
    slug: "contoh-informasi-akademik",
    title: "Contoh: informasi layanan akademik",
  },
  {
    category: "Kesempatan mahasiswa",
    date: "Contoh tanggal",
    excerpt:
      "Contoh format untuk kesempatan, kegiatan, atau layanan yang sudah siap dipublikasikan oleh BEM.",
    readTime: "Contoh 2 menit baca",
    slug: "contoh-kesempatan-mahasiswa",
    title: "Contoh: kesempatan untuk mahasiswa FTI",
  },
] as const;

export function findPublicArticle(
  collection: readonly PublicArticle[],
  slug: string,
) {
  return collection.find((article) => article.slug === slug);
}
