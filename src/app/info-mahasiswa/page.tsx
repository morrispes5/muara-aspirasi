import type { Metadata } from "next";

import { ArticleCard } from "@/components/public/article-card";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/layout/container";
import { PublicPageIntro } from "@/components/public/public-page-intro";
import { studentInfoPosts } from "@/lib/public-content";

export const metadata: Metadata = {
  title: "Info Mahasiswa",
  description:
    "Contoh ruang informasi mahasiswa dari BEM FTI Universitas Budi Luhur.",
};

export default function InfoMahasiswaPage() {
  return (
    <PublicPageIntro
      description="Ruang ini akan memuat informasi yang relevan, terverifikasi, dan mudah ditemukan mahasiswa. Seluruh entri pada tahap ini adalah contoh tampilan."
      eyebrow="Info mahasiswa"
      title="Informasi yang membantu mahasiswa mengambil langkah berikutnya"
    >
      <section className="bg-surface py-12 sm:py-16">
        <Container className="grid gap-4 md:grid-cols-2">
          {studentInfoPosts.map((article) => (
            <ArticleCard
              article={article}
              basePath="/info-mahasiswa"
              key={article.slug}
            />
          ))}
        </Container>
        <Container className="mt-8">
          <Card className="border-warning/25 bg-warning-soft text-warning">
            <Badge tone="warning">Contoh tampilan</Badge>
            <p className="mt-3 text-sm leading-6">
              Belum ada informasi operasional atau jadwal nyata yang
              dipublikasikan. Archive, filter, dan publication workflow dibuat
              setelah data dan role BEM tersedia.
            </p>
          </Card>
        </Container>
      </section>
    </PublicPageIntro>
  );
}
