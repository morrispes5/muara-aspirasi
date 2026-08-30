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
        <Link
          className="text-brand hover:text-brand-dark rounded-control py-1 focus-visible:outline-none"
          href={`${basePath}/${article.slug}`}
        >
          Baca selengkapnya
        </Link>
      </div>
    </Card>
  );
}
