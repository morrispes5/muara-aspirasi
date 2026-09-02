import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/app-url";

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
  return publicPaths.map((path) => ({ url: absoluteUrl(path) }));
}
