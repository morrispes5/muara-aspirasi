import { redirect } from "next/navigation";

import { ContentManager } from "@/components/admin/content-manager";
import { StateCard } from "@/components/ui/state-card";

import {
  AuthorizationError,
  requireBemPermission,
} from "@/server/auth/session";
import { type BemPermission, hasPermission } from "@/server/auth/roles";

import {
  type ContentKind,
  ContentServiceError,
  listAdminContent,
  studentInfoCategories,
  studentInfoCategoryLabels,
} from "@/server/content/publication";
import { createCategoryRepository } from "@/server/db/repositories";
import { recordAuthAuditEvent } from "@/server/auth/audit";

type ContentManagerPageProps = {
  description: string;
  kind: ContentKind;
  permission: BemPermission;
  title: string;
};

function AccessDenied() {
  return (
    <StateCard
      description="Peranmu dapat membuka ruang kerja BEM, tetapi belum memiliki izin mengelola jenis konten ini."
      title="Akses konten dibatasi"
    />
  );
}

export async function ContentManagerPage({
  description,
  kind,
  permission,
  title,
}: ContentManagerPageProps) {
  let pageData:
    | {
        categories: Array<{ id: string; label: string; value: string }>;
        initial: Awaited<ReturnType<typeof listAdminContent>>;
        session: Awaited<ReturnType<typeof requireBemPermission>>;
      }
    | undefined;

  try {
    const session = await requireBemPermission(permission);
    const initial = await listAdminContent(kind, { page: 1, pageSize: 50 });
    const categories =
      kind === "advocacy"
        ? (await createCategoryRepository().listActive()).map((category) => ({
            id: category.id,
            label: category.name,
            value: category.slug,
          }))
        : studentInfoCategories.map((category) => ({
            id: category,
            label: studentInfoCategoryLabels[category],
            value: category,
          }));

    await recordAuthAuditEvent({
      action: "CONTENT_QUEUE_VIEWED",
      actorType: "BEM_USER",
      actorUserId: session.user.id,
      metadata: { contentKind: kind, resultCount: initial.items.length },
      result: "SUCCESS",
      targetId: "collection",
      targetType:
        kind === "advocacy" ? "ADVOCACY_UPDATES" : "STUDENT_INFO_POSTS",
    });

    pageData = { categories, initial, session };
  } catch (error) {
    if (error instanceof AuthorizationError) {
      if (error.statusCode === 401) {
        redirect(
          kind === "advocacy"
            ? "/admin/login?next=%2Fadmin%2Fupdate"
            : "/admin/login?next=%2Fadmin%2Finfo-mahasiswa",
        );
      }
      return <AccessDenied />;
    }

    if (error instanceof ContentServiceError) {
      return (
        <StateCard
          description={error.message}
          title="Konten belum dapat dimuat"
          tone="error"
        />
      );
    }

    return (
      <StateCard
        description="Sistem tidak mengirim detail teknis atau data privat ke halaman admin. Coba lagi beberapa saat."
        title="Konten belum dapat dimuat"
        tone="error"
      />
    );
  }

  if (!pageData) {
    throw new Error("Content manager page data was not loaded.");
  }

  return (
    <div className="grid gap-8">
      <header className="max-w-3xl">
        <p className="text-brand text-xs font-bold tracking-[0.16em] uppercase">
          Publikasi BEM
        </p>
        <h1 className="font-display text-ink mt-4 text-4xl leading-[1.02] tracking-[-0.04em] sm:text-5xl">
          {title}
        </h1>
        <p className="text-muted mt-5 text-base leading-7 sm:text-lg">
          {description}
        </p>
      </header>
      <ContentManager
        canApprove={hasPermission(
          pageData.session.user.role,
          "APPROVE_PUBLICATION",
        )}
        categories={pageData.categories}
        initial={pageData.initial}
        kind={kind}
      />
    </div>
  );
}
