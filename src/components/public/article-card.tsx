import type { PublicArticleSummary } from "@/lib/public-content";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import Link from "next/link";

type ArticleCardProps = {
  article: PublicArticleSummary;
  basePath: "/info-mahasiswa" | "/update";
};

export function ArticleCard({ article, basePath }: ArticleCardProps) {
  return (
    <Card className="flex h-full flex-col justify-between gap-6">
      <div className="space-y-4">
        <Badge>{article.category}</Badge>
        <div>
          <h2 className="font-display text-ink text-2xl leading-tight tracking-[-0.03em]">
            {article.title}
          </h2>
          <p className="text-muted mt-3 text-sm leading-6">{article.excerpt}</p>
        </div>
      </div>
      <div className="border-line flex items-center justify-between border-t pt-4 text-xs font-semibold text-[#4e5f76]">
        <span>{article.date}</span>
        {/*
          Every card carries the same visible link text, so the accessible name
          names the article it opens — otherwise a screen reader's link list is
          a column of identical "Baca selengkapnya" entries. The visible text is
          kept as a prefix so voice control still matches what is on screen.

          No `focus-visible:outline-none` here: that utility outranks the shared
          `:focus-visible` ring in `globals.css` on specificity and left this
          link, the main way into every archive article, with no visible focus
          indicator at all.
        */}
        <Link
          aria-label={`Baca selengkapnya: ${article.title}`}
          className="text-brand hover:text-brand-dark rounded-control py-1"
          href={`${basePath}/${article.slug}`}
        >
          Baca selengkapnya
        </Link>
      </div>
    </Card>
  );
}
