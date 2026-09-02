import { and, asc, desc, eq, isNotNull } from "drizzle-orm";

import {
  advocacyUpdateReports,
  advocacyUpdates,
  aspirationReports,
  reportStatusEvents,
} from "@/server/db/schema";
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
  publicUpdates: Array<{
    publishedAt: Date;
    slug: string;
    summary: string;
    title: string;
  }>;
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

  const publicUpdates = await database
    .select({
      publishedAt: advocacyUpdates.publishedAt,
      slug: advocacyUpdates.slug,
      summary: advocacyUpdates.summary,
      title: advocacyUpdates.title,
    })
    .from(advocacyUpdateReports)
    .innerJoin(
      advocacyUpdates,
      eq(advocacyUpdateReports.advocacyUpdateId, advocacyUpdates.id),
    )
    .where(
      and(
        eq(advocacyUpdateReports.reportId, report.id),
        eq(advocacyUpdates.publicationStatus, "PUBLISHED"),
        isNotNull(advocacyUpdates.publishedAt),
      ),
    )
    .orderBy(desc(advocacyUpdates.publishedAt));

  return {
    events,
    lastUpdatedAt: report.updatedAt,
    publicUpdates: publicUpdates.map((update) => ({
      ...update,
      publishedAt: update.publishedAt as Date,
    })),
    status: report.status,
    submittedAt: report.submittedAt,
    trackingCode: report.trackingCode,
  };
}
