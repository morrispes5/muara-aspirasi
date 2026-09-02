import Link from "next/link";

type ContentPaginationProps = {
  basePath: "/info-mahasiswa" | "/update";
  category?: string;
  page: number;
  totalPages: number;
};

function href(
  basePath: ContentPaginationProps["basePath"],
  page: number,
  category?: string,
) {
  const params = new URLSearchParams({ page: String(page) });
  if (category) params.set("category", category);
  return `${basePath}?${params.toString()}`;
}

export function ContentPagination({
  basePath,
  category,
  page,
  totalPages,
}: ContentPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Navigasi halaman konten"
      className="flex flex-wrap items-center justify-between gap-3"
    >
      {page > 1 ? (
        <Link
          className="text-brand rounded-control border-line hover:border-brand border px-4 py-2 text-sm font-bold"
          href={href(basePath, page - 1, category)}
        >
          Sebelumnya
        </Link>
      ) : (
        <span />
      )}
      <span className="text-muted text-sm">
        Halaman {page} dari {totalPages}
      </span>
      {page < totalPages ? (
        <Link
          className="text-brand rounded-control border-line hover:border-brand border px-4 py-2 text-sm font-bold"
          href={href(basePath, page + 1, category)}
        >
          Berikutnya
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
