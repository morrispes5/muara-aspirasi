import { eq } from "drizzle-orm";

import { type Database, getDatabase } from "@/server/db/client";
import { aspirationReports } from "@/server/db/schema";

/**
 * Restricted internal lookup. It deliberately does not join ReporterIdentity or
 * ReportEvidence; authorization and privacy projections arrive in later milestones.
 */
export function createReportRepository(database: Database = getDatabase()) {
  return {
    findInternalById(reportId: string) {
      return database
        .select({
          categoryId: aspirationReports.categoryId,
          id: aspirationReports.id,
          status: aspirationReports.status,
          submittedAt: aspirationReports.submittedAt,
          title: aspirationReports.title,
          urgency: aspirationReports.urgency,
        })
        .from(aspirationReports)
        .where(eq(aspirationReports.id, reportId))
        .limit(1);
    },
  };
}
