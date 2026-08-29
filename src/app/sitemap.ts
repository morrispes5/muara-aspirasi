import type { MetadataRoute } from "next";

const publicPaths = [
  "",
  "/tentang",
  "/aspirasi/kirim",
  "/aspirasi/lacak",
  "/update",
  "/info-mahasiswa",
  "/kebijakan-privasi",
  "/etika-pelaporan",
  "/transparansi",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return publicPaths.map((path) => ({
    url: new URL(path, appUrl).toString(),
  }));
}
