export type PublicArticle = {
  body: string;
  category: string;
  date: string;
  excerpt: string;
  isPinned?: boolean;
  progressLabel?: string;
  readTime: string;
  slug: string;
  sourceCredit?: string | null;
  sourceUrl?: string | null;
  title: string;
};

export type PublicArticleSummary = Omit<PublicArticle, "body">;
