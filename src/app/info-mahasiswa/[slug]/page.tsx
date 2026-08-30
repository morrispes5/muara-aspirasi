import type { Metadata } from "next";

import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/layout/container";
import { PublicPageIntro } from "@/components/public/public-page-intro";

import {
  articleReadTime,
  getPublishedContent,
} from "@/server/content/publication";

export const dynamic = "force-dynamic";

type InfoDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: InfoDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getPublishedContent("student-info", slug);

  return {
    title: article?.title ?? "Informasi tidak ditemukan",
    description: article?.excerpt,
  };
}

export default async function InfoDetailPage({ params }: InfoDetailPageProps) {
  const { slug } = await params;
  const article = await getPublishedContent("student-info", slug);

  if (!article) notFound();

  return (
    <PublicPageIntro
      description={article.excerpt}
      eyebrow="Info mahasiswa"
      title={article.title}
    >
      <section className="bg-surface py-12 sm:py-16">
        <Container className="max-w-3xl">
          <Card className="space-y-6">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <Badge>{article.category}</Badge>
              <span className="text-muted">{article.date}</span>
              <span className="text-muted">{articleReadTime(article)}</span>
            </div>
            <div className="text-muted space-y-4 text-base leading-8">
              {article.body.split(/\n{2,}/).map((paragraph, index) => (
                <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
              ))}
            </div>
            {article.sourceUrl || article.sourceCredit ? (
              <div className="text-muted border-line border-t pt-4 text-xs">
                {article.sourceUrl ? (
                  <a
                    className="text-brand hover:text-brand-dark font-bold underline"
                    href={article.sourceUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Buka sumber informasi
                  </a>
                ) : null}
                {article.sourceCredit ? (
                  <p className="mt-2">Sumber/kredit: {article.sourceCredit}</p>
                ) : null}
              </div>
            ) : null}
          </Card>
          <ButtonLink className="mt-6" href="/info-mahasiswa" variant="outline">
            Kembali ke info mahasiswa
          </ButtonLink>
        </Container>
      </section>
    </PublicPageIntro>
  );
}
