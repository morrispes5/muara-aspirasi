import type { Metadata } from "next";

import { notFound } from "next/navigation";

import { findPublicArticle, studentInfoPosts } from "@/lib/public-content";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/layout/container";
import { PublicPageIntro } from "@/components/public/public-page-intro";

type InfoDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return studentInfoPosts.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: InfoDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = findPublicArticle(studentInfoPosts, slug);

  return {
    title: article?.title ?? "Informasi tidak ditemukan",
    description: article?.excerpt,
  };
}

export default async function InfoDetailPage({ params }: InfoDetailPageProps) {
  const { slug } = await params;
  const article = findPublicArticle(studentInfoPosts, slug);

  if (!article) {
    notFound();
  }

  return (
    <PublicPageIntro
      description={article.excerpt}
      eyebrow="Contoh info mahasiswa"
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
            <p className="text-muted text-base leading-8">
              Ini adalah contoh halaman informasi. Pada milestone berikutnya,
              BEM akan dapat mengelola konten terverifikasi melalui workflow
              draft, review, dan publikasi tanpa mengubah kode aplikasi.
            </p>
          </Card>
          <ButtonLink className="mt-6" href="/info-mahasiswa" variant="outline">
            Kembali ke info mahasiswa
          </ButtonLink>
        </Container>
      </section>
    </PublicPageIntro>
  );
}
