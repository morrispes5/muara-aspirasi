import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  AuthorizationError,
  requireBemPermission,
} from "@/server/auth/session";
import {
  CaseManagementError,
  listBemAssignees,
  listReportQueue,
  parseReportQueueQuery,
} from "@/server/aspirations/case-management";
import { createCategoryRepository } from "@/server/db/repositories";
import { recordAuthAuditEvent } from "@/server/auth/audit";
import { ReportQueue } from "@/components/admin/report-queue";
import { StateCard } from "@/components/ui/state-card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Antrean Laporan",
  description: "Antrean privat laporan aspirasi untuk workflow BEM.",
};

function AccessDenied() {
  return (
    <StateCard
      description="Peranmu dapat membuka ruang kerja BEM, tetapi belum memiliki izin melihat antrean laporan privat."
      title="Akses laporan dibatasi"
    />
  );
}

export default async function ReportQueuePage() {
  let pageData:
    | {
        assignees: Awaited<ReturnType<typeof listBemAssignees>>;
        categories: Array<{ id: string; name: string }>;
        reports: Awaited<ReturnType<typeof listReportQueue>>;
      }
    | undefined;

  try {
    const session = await requireBemPermission("VIEW_REPORTS");
    const query = parseReportQueueQuery(new URLSearchParams());
    const [reports, categories, assignees] = await Promise.all([
      listReportQueue(query),
      createCategoryRepository().listActive(),
      listBemAssignees(),
    ]);

    await recordAuthAuditEvent({
      action: "REPORT_QUEUE_VIEWED",
      actorType: "BEM_USER",
      actorUserId: session.user.id,
      metadata: { page: query.page, resultCount: reports.items.length },
      result: "SUCCESS",
      targetId: "collection",
      targetType: "ASPIRATION_REPORTS",
    });

    pageData = { assignees, categories, reports };
  } catch (error) {
    if (error instanceof AuthorizationError) {
      if (error.statusCode === 401) {
        redirect("/admin/login?next=%2Fadmin%2Flaporan");
      }

      return <AccessDenied />;
    }

    if (error instanceof CaseManagementError) {
      return (
        <StateCard
          description={error.message}
          title="Antrean belum dapat dimuat"
          tone="error"
        />
      );
    }

    throw error;
  }

  if (!pageData) {
    throw new Error("Report queue page data was not loaded.");
  }

  return (
    <ReportQueue
      assignees={pageData.assignees}
      categories={pageData.categories}
      initial={pageData.reports}
      key={`${pageData.reports.page}-${pageData.reports.totalItems}`}
    />
  );
}
