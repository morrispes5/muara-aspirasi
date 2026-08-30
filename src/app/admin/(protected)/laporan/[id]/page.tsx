import type { Metadata } from "next";

import { notFound, redirect } from "next/navigation";

import {
  AuthorizationError,
  requireBemPermission,
} from "@/server/auth/session";
import {
  CaseManagementError,
  getReportDetail,
  listBemAssignees,
} from "@/server/aspirations/case-management";
import { createCategoryRepository } from "@/server/db/repositories";
import { hasPermission } from "@/server/auth/roles";
import { recordAuthAuditEvent } from "@/server/auth/audit";
import { ReportDetailView } from "@/components/admin/report-detail";
import { StateCard } from "@/components/ui/state-card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Detail Laporan",
  description: "Detail privat dan workflow laporan aspirasi BEM.",
};

type ReportDetailPageProps = {
  params: Promise<{ id: string }>;
};

function AccessDenied() {
  return (
    <StateCard
      description="Peranmu belum memiliki izin melihat laporan privat ini. Tidak ada isi laporan atau identitas yang ditampilkan."
      title="Akses detail dibatasi"
    />
  );
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export default async function ReportDetailPage({
  params,
}: ReportDetailPageProps) {
  const { id } = await params;

  if (!isUuid(id)) {
    notFound();
  }

  let pageData:
    | {
        assignees: Awaited<ReturnType<typeof listBemAssignees>>;
        canAudit: boolean;
        canManageLifecycle: boolean;
        canProcess: boolean;
        categories: Array<{ id: string; name: string }>;
        report: NonNullable<Awaited<ReturnType<typeof getReportDetail>>>;
      }
    | undefined;

  try {
    const session = await requireBemPermission("VIEW_REPORTS");
    const includeRestricted = hasPermission(
      session.user.role,
      "VIEW_CONFIDENTIAL_REPORT",
    );
    const canProcess = hasPermission(session.user.role, "PROCESS_REPORT");
    const canAudit = hasPermission(session.user.role, "VIEW_AUDIT");
    const canManageLifecycle =
      hasPermission(session.user.role, "ARCHIVE_REPORT") ||
      hasPermission(session.user.role, "REOPEN_REPORT");
    const [report, categories, assignees] = await Promise.all([
      getReportDetail(id, {
        includeAudit: canAudit,
        includeRestricted,
      }),
      createCategoryRepository().listActive(),
      canProcess ? listBemAssignees() : Promise.resolve([]),
    ]);

    if (!report) {
      notFound();
    }

    await recordAuthAuditEvent({
      action: "REPORT_DETAIL_VIEWED",
      actorType: "BEM_USER",
      actorUserId: session.user.id,
      metadata: {
        confidentialProjection: includeRestricted,
        evidenceProjection: includeRestricted,
      },
      result: "SUCCESS",
      targetId: id,
      targetType: "ASPIRATION_REPORT",
    });

    pageData = {
      assignees,
      canAudit,
      canManageLifecycle,
      canProcess,
      categories: categories.map(({ id: categoryId, name }) => ({
        id: categoryId,
        name,
      })),
      report,
    };
  } catch (error) {
    if (error instanceof AuthorizationError) {
      if (error.statusCode === 401) {
        redirect(
          `/admin/login?next=${encodeURIComponent(`/admin/laporan/${id}`)}`,
        );
      }

      return <AccessDenied />;
    }

    if (
      error instanceof CaseManagementError &&
      error.code === "REPORT_NOT_FOUND"
    ) {
      notFound();
    }

    throw error;
  }

  if (!pageData) {
    throw new Error("Report detail page data was not loaded.");
  }

  return (
    <ReportDetailView
      assignees={pageData.assignees}
      canAudit={pageData.canAudit}
      canManageLifecycle={pageData.canManageLifecycle}
      canProcess={pageData.canProcess}
      categories={pageData.categories}
      initial={pageData.report}
      key={pageData.report.report.updatedAt}
    />
  );
}
