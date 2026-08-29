import type { Metadata } from "next";

import { advocacyUpdates } from "@/lib/public-content";
import { ArticleCard } from "@/components/public/article-card";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/layout/container";
import { PublicPageIntro } from "@/components/public/public-page-intro";

export const metadata: Metadata = {
  title: "Update Advokasi",
  description:
    "Contoh arsip pembaruan advokasi BEM yang aman bagi pelapor dan publik.",
};

export default function UpdatePage() {
  return (
    <PublicPageIntro
      description="Pembaruan advokasi menjelaskan proses yang aman dibagikan, bukan menampilkan laporan mahasiswa atau detail identitasnya. Semua entri saat ini adalah contoh tampilan."
      eyebrow="Update advokasi"
      title="Membaca progres tanpa mengekspos pelapor"
    >
      <section className="bg-surface py-12 sm:py-16">
        <Container className="grid gap-4 md:grid-cols-2">
          {advocacyUpdates.map((article) => (
            <ArticleCard
              article={article}
              basePath="/update"
              key={article.slug}
            />
          ))}
        </Container>
        <Container className="mt-8">
          <Card className="border-warning/25 bg-warning-soft text-warning">
            <Badge tone="warning">Contoh tampilan</Badge>
            <p className="mt-3 text-sm leading-6">
              Belum ada data advokasi nyata, filter, atau publication workflow.
              Semua angka, tanggal, dan kasus di halaman ini bersifat
              ilustratif.
            </p>
          </Card>
        </Container>
      </section>
    </PublicPageIntro>
  );
}
