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

type UpdateDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: UpdateDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getPublishedContent("advocacy", slug);

  return {
    title: article?.title ?? "Update tidak ditemukan",
    description: article?.excerpt,
  };
}

export default async function UpdateDetailPage({
  params,
}: UpdateDetailPageProps) {
  const { slug } = await params;
  const article = await getPublishedContent("advocacy", slug);

  if (!article) notFound();

  return (
    <PublicPageIntro
      description={article.excerpt}
      eyebrow="Update advokasi"
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
            {article.progressLabel ? (
              <p className="text-brand border-brand/20 bg-brand-soft rounded-control border px-4 py-3 text-sm font-bold">
                Status: {article.progressLabel}
              </p>
            ) : null}
            {article.sourceCredit ? (
              <p className="text-muted border-line border-t pt-4 text-xs">
                Sumber/kredit: {article.sourceCredit}
              </p>
            ) : null}
          </Card>
          <ButtonLink className="mt-6" href="/update" variant="outline">
            Kembali ke update advokasi
          </ButtonLink>
        </Container>
      </section>
    </PublicPageIntro>
  );
}
