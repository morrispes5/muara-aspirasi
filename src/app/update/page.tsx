import type { Metadata } from "next";

import { ArticleCard } from "@/components/public/article-card";
import { Container } from "@/components/layout/container";
import { ContentPagination } from "@/components/public/content-pagination";
import { PublicPageIntro } from "@/components/public/public-page-intro";
import { StateCard } from "@/components/ui/state-card";

import {
  listPublishedContent,
  type PublicContentResult,
} from "@/server/content/publication";

import { createCategoryRepository } from "@/server/db/repositories";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Update Advokasi",
  description:
    "Pembaruan advokasi BEM FTI yang telah ditinjau dan aman dibaca publik.",
};

type UpdatePageProps = {
  searchParams: Promise<{
    category?: string | string[];
    page?: string | string[];
  }>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function UpdatePage({ searchParams }: UpdatePageProps) {
  const params = await searchParams;
  const category = first(params.category);
  const parsedPage = Number(first(params.page) ?? "1");
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  let content: PublicContentResult;
  let categoryOptions: Array<{ id: string; name: string; slug: string }>;
  try {
    [content, categoryOptions] = await Promise.all([
      listPublishedContent("advocacy", { category, page }),
      createCategoryRepository().listActive(),
    ]);
  } catch {
    return (
      <PublicPageIntro
        description="Pembaruan advokasi sedang tidak dapat dimuat. Coba lagi beberapa saat."
        eyebrow="Update advokasi"
        title="Arsip belum dapat dibuka"
      >
        <section className="bg-surface py-12 sm:py-16">
          <Container>
            <StateCard
              description="Sistem tidak mengirim detail teknis atau data privat ke halaman publik."
              title="Terjadi kendala sementara"
              tone="error"
            />
          </Container>
        </section>
      </PublicPageIntro>
    );
  }

  return (
    <PublicPageIntro
      description="Pembaruan advokasi menjelaskan proses yang aman dibagikan, bukan menampilkan laporan mahasiswa atau detail identitasnya."
      eyebrow="Update advokasi"
      title="Membaca progres tanpa mengekspos pelapor"
    >
      <section className="bg-surface py-12 sm:py-16">
        <Container className="grid gap-8">
          <form className="flex flex-wrap items-end gap-3" method="get">
            <label className="text-ink grid min-w-52 gap-2 text-sm font-bold">
              Kategori
              <select
                className="rounded-control border-line bg-surface min-h-11 border px-3 text-sm font-normal"
                defaultValue={category ?? ""}
                name="category"
              >
                <option value="">Semua kategori</option>
                {categoryOptions.map((item) => (
                  <option key={item.id} value={item.slug}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="bg-brand rounded-control hover:bg-brand-dark min-h-11 px-5 text-sm font-bold text-white"
              type="submit"
            >
              Terapkan filter
            </button>
          </form>
          {content.items.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {content.items.map((article) => (
                <ArticleCard
                  article={article}
                  basePath="/update"
                  key={article.slug}
                />
              ))}
            </div>
          ) : (
            <StateCard
              description="Belum ada update advokasi yang sudah dipublikasikan pada kategori ini."
              title="Belum ada update"
            />
          )}
          <ContentPagination
            basePath="/update"
            category={category}
            page={content.page}
            totalPages={content.totalPages}
          />
        </Container>
      </section>
    </PublicPageIntro>
  );
}
