import { and, asc, eq } from "drizzle-orm";

import { aspirationReports, reportStatusEvents } from "@/server/db/schema";
import { type Database, getDatabase } from "@/server/db/client";
import { type TrackingInput } from "@/server/aspirations/validation";
import { verifyTrackingSecret } from "@/server/aspirations/tracking";

export type ReporterTimeline = {
  events: Array<{
    createdAt: Date;
    message: string | null;
    status: string | null;
  }>;
  lastUpdatedAt: Date;
  status: string;
  submittedAt: Date;
  trackingCode: string;
};

export async function findReporterTimeline(
  input: TrackingInput,
  database: Database = getDatabase(),
): Promise<ReporterTimeline | null> {
  const [report] = await database
    .select({
      id: aspirationReports.id,
      status: aspirationReports.status,
      submittedAt: aspirationReports.submittedAt,
      trackingCode: aspirationReports.trackingCode,
      trackingSecretHash: aspirationReports.trackingSecretHash,
      updatedAt: aspirationReports.updatedAt,
    })
    .from(aspirationReports)
    .where(eq(aspirationReports.trackingCode, input.trackingCode))
    .limit(1);

  if (
    !report ||
    !(await verifyTrackingSecret(
      input.trackingSecret,
      report.trackingSecretHash,
    ))
  ) {
    return null;
  }

  const events = await database
    .select({
      createdAt: reportStatusEvents.createdAt,
      message: reportStatusEvents.reporterMessage,
      status: reportStatusEvents.toStatus,
    })
    .from(reportStatusEvents)
    .where(
      and(
        eq(reportStatusEvents.reportId, report.id),
        eq(reportStatusEvents.isReporterVisible, true),
      ),
    )
    .orderBy(asc(reportStatusEvents.createdAt));

  return {
    events,
    lastUpdatedAt: report.updatedAt,
    status: report.status,
    submittedAt: report.submittedAt,
    trackingCode: report.trackingCode,
  };
}
