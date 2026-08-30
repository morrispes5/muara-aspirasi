import type { Metadata } from "next";

import { ArticleCard } from "@/components/public/article-card";
import { Container } from "@/components/layout/container";
import { ContentPagination } from "@/components/public/content-pagination";
import { PublicPageIntro } from "@/components/public/public-page-intro";
import { StateCard } from "@/components/ui/state-card";

import {
  listPublishedContent,
  type PublicContentResult,
  studentInfoCategories,
  studentInfoCategoryLabels,
} from "@/server/content/publication";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Info Mahasiswa",
  description:
    "Informasi mahasiswa BEM FTI yang telah ditinjau dan aman dibaca publik.",
};

type InfoPageProps = {
  searchParams: Promise<{
    category?: string | string[];
    page?: string | string[];
  }>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function InfoMahasiswaPage({
  searchParams,
}: InfoPageProps) {
  const params = await searchParams;
  const category = first(params.category);
  const parsedPage = Number(first(params.page) ?? "1");
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  let content: PublicContentResult;

  try {
    content = await listPublishedContent("student-info", { category, page });
  } catch {
    return (
      <PublicPageIntro
        description="Informasi mahasiswa sedang tidak dapat dimuat. Coba lagi beberapa saat."
        eyebrow="Info mahasiswa"
        title="Informasi belum dapat dibuka"
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
      description="Ruang ini memuat informasi yang relevan, terverifikasi, dan mudah ditemukan mahasiswa."
      eyebrow="Info mahasiswa"
      title="Informasi yang membantu mahasiswa mengambil langkah berikutnya"
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
                {studentInfoCategories.map((item) => (
                  <option key={item} value={item}>
                    {studentInfoCategoryLabels[item]}
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
                  basePath="/info-mahasiswa"
                  key={article.slug}
                />
              ))}
            </div>
          ) : (
            <StateCard
              description="Belum ada informasi yang sudah dipublikasikan pada kategori ini."
              title="Belum ada informasi"
            />
          )}
          <ContentPagination
            basePath="/info-mahasiswa"
            category={category}
            page={content.page}
            totalPages={content.totalPages}
          />
        </Container>
      </section>
    </PublicPageIntro>
  );
}
