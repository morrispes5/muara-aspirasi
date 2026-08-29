import type { Metadata } from "next";

import { notFound } from "next/navigation";

import { advocacyUpdates, findPublicArticle } from "@/lib/public-content";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/layout/container";
import { PublicPageIntro } from "@/components/public/public-page-intro";

type UpdateDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return advocacyUpdates.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: UpdateDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = findPublicArticle(advocacyUpdates, slug);

  return {
    title: article?.title ?? "Update tidak ditemukan",
    description: article?.excerpt,
  };
}

export default async function UpdateDetailPage({
  params,
}: UpdateDetailPageProps) {
  const { slug } = await params;
  const article = findPublicArticle(advocacyUpdates, slug);

  if (!article) {
    notFound();
  }

  return (
    <PublicPageIntro
      description={article.excerpt}
      eyebrow="Contoh update advokasi"
      title={article.title}
    >
      <section className="bg-surface py-12 sm:py-16">
        <Container className="max-w-3xl">
          <Card className="space-y-6">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <Badge>{article.category}</Badge>
              <span className="text-muted">{article.date}</span>
              <span className="text-muted">{article.readTime}</span>
            </div>
            <div className="text-muted space-y-4 text-base leading-8">
              <p>
                Ini adalah contoh struktur update publik. Saat layanan aktif,
                BEM hanya menerbitkan fakta yang telah ditinjau, tindakan yang
                sudah atau sedang ditempuh, dan langkah berikutnya yang aman
                untuk dibagikan.
              </p>
              <p>
                Laporan asli, identitas pelapor, bukti, catatan internal, serta
                hubungan antara laporan dan update tidak akan ditampilkan di
                halaman publik.
              </p>
            </div>
          </Card>
          <ButtonLink className="mt-6" href="/update" variant="outline">
            Kembali ke update advokasi
          </ButtonLink>
        </Container>
      </section>
    </PublicPageIntro>
  );
}
