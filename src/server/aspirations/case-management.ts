import {
  aliasedTable,
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lt,
  or,
  sql,
} from "drizzle-orm";

import {
  aspirationReports,
  auditEvents,
  bemUsers,
  categories,
  internalNotes,
  reportAssignments,
  reporterIdentities,
  reportEvidence,
  reportStatusEvents,
} from "@/server/db/schema";
import { type Database, getDatabase } from "@/server/db/client";

export const reportStatuses = [
  "RECEIVED",
  "UNDER_REVIEW",
  "NEEDS_CLARIFICATION",
  "IN_COORDINATION",
  "UPDATE_AVAILABLE",
  "ACTION_TAKEN",
  "RESOLVED",
  "CANNOT_PROCESS",
] as const;

export type ReportStatus = (typeof reportStatuses)[number];

export const reportUrgencies = ["LOW", "NORMAL", "HIGH", "ESCALATE"] as const;

export type ReportUrgency = (typeof reportUrgencies)[number];

export const reportReasonCodes = [
  "DUPLICATE_REPORT",
  "INSUFFICIENT_INFORMATION",
  "OUT_OF_SCOPE",
  "POLICY_VIOLATION",
  "SAFETY_ESCALATION",
  "OPERATIONAL_CORRECTION",
] as const;

export type ReportReasonCode = (typeof reportReasonCodes)[number];

export const reportAssignmentsFilter = [
  "ALL",
  "ASSIGNED",
  "UNASSIGNED",
] as const;

export type ReportAssignmentsFilter = (typeof reportAssignmentsFilter)[number];

export const reportArchiveFilter = ["ACTIVE", "ARCHIVED", "ALL"] as const;

export type ReportArchiveFilter = (typeof reportArchiveFilter)[number];

export type ReportQueueQuery = {
  assigneeUserId?: string;
  archived: ReportArchiveFilter;
  assignment: ReportAssignmentsFilter;
  categoryId?: string;
  fromDate?: string;
  page: number;
  pageSize: number;
  search?: string;
  status?: ReportStatus;
  toDate?: string;
  urgency?: ReportUrgency;
};

export type ReportQueueItem = {
  archivedAt: string | null;
  assignment: {
    assigneeId: string | null;
    assigneeName: string | null;
    id: string;
    routeLabel: string;
  } | null;
  category: { id: string; name: string };
  id: string;
  location: string;
  status: ReportStatus;
  submittedAt: string;
  title: string;
  updatedAt: string;
  urgency: ReportUrgency;
};

export type ReportQueueResult = {
  items: ReportQueueItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type BemAssignee = {
  email: string;
  id: string;
  name: string;
  role: "ADVOCATE" | "ADMIN";
};

export type ReportDetail = {
  assignments: Array<{
    assigneeId: string | null;
    assigneeName: string | null;
    assignedAt: string;
    assignedByName: string;
    endedAt: string | null;
    id: string;
    reason: string | null;
    routeLabel: string;
  }>;
  audit: Array<{
    action: string;
    actorName: string | null;
    occurredAt: string;
    reasonCode: string | null;
    result: string;
  }>;
  evidence: Array<{
    checksumSha256: string;
    createdAt: string;
    id: string;
    mimeType: string;
    originalFilename: string;
    sizeBytes: number;
    validationStatus: string;
  }>;
  identity: {
    consentRecordedAt: string | null;
    consentVersion: string | null;
    contactAllowed: boolean;
    email: string | null;
    identityShareScope: string;
    name: string;
    nim: string;
    whatsapp: string | null;
  } | null;
  internalNotes: Array<{
    authorName: string;
    body: string | null;
    createdAt: string;
    deletedAt: string | null;
    deletionReason: string | null;
    id: string;
    updatedAt: string;
  }>;
  report: {
    archivedAt: string | null;
    category: { id: string; name: string };
    chronology: string;
    id: string;
    impact: string;
    internalSummary: string | null;
    location: string;
    resolvedAt: string | null;
    status: ReportStatus;
    submittedAt: string;
    suggestedSolution: string | null;
    title: string;
    trackingCode: string;
    updatedAt: string;
    urgency: ReportUrgency;
  };
  statusEvents: Array<{
    actorName: string | null;
    createdAt: string;
    fromStatus: ReportStatus | null;
    isReporterVisible: boolean;
    reasonCode: string | null;
    reporterMessage: string | null;
    toStatus: ReportStatus | null;
  }>;
};

type CaseManagementErrorCode =
  | "ASSIGNEE_NOT_FOUND"
  | "CONFLICT"
  | "INVALID_TRANSITION"
  | "NOTE_NOT_FOUND"
  | "NO_CHANGE"
  | "REASON_REQUIRED"
  | "REPORT_ARCHIVED"
  | "REPORT_NOT_FOUND"
  | "VALIDATION_ERROR";

export class CaseManagementError extends Error {
  constructor(
    public readonly code: CaseManagementErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "CaseManagementError";
  }
}

type CaseReadDatabase = Pick<Database, "select">;
type CaseWriteDatabase = Pick<Database, "insert" | "select" | "update">;

const transitions: Record<ReportStatus, ReadonlySet<ReportStatus>> = {
  ACTION_TAKEN: new Set(["RESOLVED"]),
  CANNOT_PROCESS: new Set(),
  IN_COORDINATION: new Set([
    "ACTION_TAKEN",
    "CANNOT_PROCESS",
    "RESOLVED",
    "UPDATE_AVAILABLE",
  ]),
  NEEDS_CLARIFICATION: new Set([
    "CANNOT_PROCESS",
    "IN_COORDINATION",
    "UNDER_REVIEW",
  ]),
  RECEIVED: new Set(["CANNOT_PROCESS", "UNDER_REVIEW"]),
  RESOLVED: new Set(),
  UNDER_REVIEW: new Set([
    "CANNOT_PROCESS",
    "IN_COORDINATION",
    "NEEDS_CLARIFICATION",
  ]),
  UPDATE_AVAILABLE: new Set(["ACTION_TAKEN", "IN_COORDINATION", "RESOLVED"]),
};

export function canTransitionReportStatus(
  fromStatus: ReportStatus,
  toStatus: ReportStatus,
) {
  return fromStatus === toStatus || transitions[fromStatus].has(toStatus);
}

const assigneeRoles = ["ADVOCATE", "ADMIN"] as const;

const listAssignee = aliasedTable(bemUsers, "report_list_assignee");
const detailStatusActor = aliasedTable(bemUsers, "status_event_actor");
const detailNoteAuthor = aliasedTable(bemUsers, "note_author");
const detailAssignmentAssignee = aliasedTable(bemUsers, "assignment_assignee");
const detailAssignmentAuthor = aliasedTable(bemUsers, "assignment_author");
const detailAuditActor = aliasedTable(bemUsers, "audit_actor");

function asIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function isOneOf<T extends readonly string[]>(
  value: unknown,
  values: T,
): value is T[number] {
  return typeof value === "string" && values.includes(value);
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

function requireUuid(value: string, field: string) {
  if (!isUuid(value)) {
    throw new CaseManagementError(
      "VALIDATION_ERROR",
      `${field} harus berupa identifier yang valid.`,
    );
  }
}

function requireText(value: string, field: string, maxLength: number) {
  const normalized = value.trim();

  if (!normalized || normalized.length > maxLength) {
    throw new CaseManagementError(
      "VALIDATION_ERROR",
      `${field} wajib diisi dan memiliki panjang yang valid.`,
    );
  }

  return normalized;
}

function optionalText(value: string | null | undefined, maxLength: number) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new CaseManagementError(
      "VALIDATION_ERROR",
      "Panjang input melebihi batas.",
    );
  }

  return normalized || null;
}

function expectedDate(value: string) {
  const parsed = new Date(value);
  if (!value || Number.isNaN(parsed.getTime())) {
    throw new CaseManagementError(
      "VALIDATION_ERROR",
      "Versi laporan tidak valid.",
    );
  }

  return parsed;
}

function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function requireCalendarDate(value: string, field: string) {
  if (!isCalendarDate(value)) {
    throw new CaseManagementError(
      "VALIDATION_ERROR",
      `${field} harus berupa tanggal yang valid.`,
    );
  }
}

function jakartaDateStart(value: string) {
  return new Date(`${value}T00:00:00.000+07:00`);
}

function nextJakartaDateStart(value: string) {
  return new Date(jakartaDateStart(value).getTime() + 24 * 60 * 60 * 1000);
}

function nextVersion(current: Date) {
  return new Date(Math.max(Date.now(), current.getTime() + 1));
}

function versionMatches(expected: Date) {
  return sql`date_trunc('milliseconds', ${aspirationReports.updatedAt}) = ${expected}`;
}

function ensureReason(reasonCode: string | null | undefined) {
  if (!isOneOf(reasonCode, reportReasonCodes)) {
    throw new CaseManagementError(
      "REASON_REQUIRED",
      "Pilih alasan yang menjelaskan tindakan ini.",
    );
  }

  return reasonCode;
}

function reportFilters(query: ReportQueueQuery) {
  const filters = [];

  if (query.archived === "ACTIVE") {
    filters.push(isNull(aspirationReports.archivedAt));
  } else if (query.archived === "ARCHIVED") {
    filters.push(isNotNull(aspirationReports.archivedAt));
  }

  if (query.status) {
    filters.push(eq(aspirationReports.status, query.status));
  }

  if (query.urgency) {
    filters.push(eq(aspirationReports.urgency, query.urgency));
  }

  if (query.categoryId) {
    filters.push(eq(aspirationReports.categoryId, query.categoryId));
  }

  if (query.fromDate) {
    filters.push(
      gte(aspirationReports.submittedAt, jakartaDateStart(query.fromDate)),
    );
  }

  if (query.toDate) {
    filters.push(
      lt(aspirationReports.submittedAt, nextJakartaDateStart(query.toDate)),
    );
  }

  if (query.assigneeUserId) {
    filters.push(eq(reportAssignments.assigneeUserId, query.assigneeUserId));
  }

  if (query.assignment === "ASSIGNED") {
    filters.push(isNotNull(reportAssignments.id));
  } else if (query.assignment === "UNASSIGNED") {
    filters.push(isNull(reportAssignments.id));
  }

  if (query.search) {
    const searchTerm = `%${query.search.replace(/[\\%_]/g, "\\$&")}%`;
    filters.push(
      or(
        ilike(aspirationReports.title, searchTerm),
        ilike(aspirationReports.location, searchTerm),
        ilike(aspirationReports.trackingCode, searchTerm),
      ),
    );
  }

  return filters.length ? and(...filters) : undefined;
}

export function parseReportQueueQuery(
  params: URLSearchParams,
): ReportQueueQuery {
  const rawPage = params.get("page");
  const rawPageSize = params.get("pageSize");
  const page = rawPage ? Number(rawPage) : 1;
  const pageSize = rawPageSize ? Number(rawPageSize) : 25;
  const status = params.get("status") || undefined;
  const urgency = params.get("urgency") || undefined;
  const categoryId = params.get("categoryId") || undefined;
  const fromDate = params.get("fromDate") || undefined;
  const search = params.get("search")?.trim() || undefined;
  const assignment = params.get("assignment") || "ALL";
  const archived = params.get("archived") || "ACTIVE";
  const assigneeUserId = params.get("assigneeUserId") || undefined;
  const toDate = params.get("toDate") || undefined;

  if (
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(pageSize) ||
    ![10, 25, 50].includes(pageSize)
  ) {
    throw new CaseManagementError(
      "VALIDATION_ERROR",
      "Parameter pagination tidak valid.",
    );
  }

  if (status && !isOneOf(status, reportStatuses)) {
    throw new CaseManagementError("VALIDATION_ERROR", "Status tidak valid.");
  }

  if (urgency && !isOneOf(urgency, reportUrgencies)) {
    throw new CaseManagementError("VALIDATION_ERROR", "Urgensi tidak valid.");
  }

  if (!isOneOf(assignment, reportAssignmentsFilter)) {
    throw new CaseManagementError(
      "VALIDATION_ERROR",
      "Filter assignment tidak valid.",
    );
  }

  if (!isOneOf(archived, reportArchiveFilter)) {
    throw new CaseManagementError(
      "VALIDATION_ERROR",
      "Filter arsip tidak valid.",
    );
  }

  if (categoryId) {
    requireUuid(categoryId, "categoryId");
  }

  if (fromDate) {
    requireCalendarDate(fromDate, "fromDate");
  }

  if (toDate) {
    requireCalendarDate(toDate, "toDate");
  }

  if (fromDate && toDate && fromDate > toDate) {
    throw new CaseManagementError(
      "VALIDATION_ERROR",
      "Rentang tanggal tidak valid.",
    );
  }

  if (assigneeUserId) {
    requireUuid(assigneeUserId, "assigneeUserId");
  }

  if (search && search.length > 80) {
    throw new CaseManagementError(
      "VALIDATION_ERROR",
      "Pencarian terlalu panjang.",
    );
  }

  const parsedStatus = isOneOf(status, reportStatuses) ? status : undefined;
  const parsedUrgency = isOneOf(urgency, reportUrgencies) ? urgency : undefined;

  return {
    archived,
    assignment,
    ...(categoryId ? { categoryId } : {}),
    ...(fromDate ? { fromDate } : {}),
    page,
    pageSize,
    ...(search ? { search } : {}),
    ...(assigneeUserId ? { assigneeUserId } : {}),
    ...(parsedStatus ? { status: parsedStatus } : {}),
    ...(toDate ? { toDate } : {}),
    ...(parsedUrgency ? { urgency: parsedUrgency } : {}),
  };
}

export async function listReportQueue(
  query: ReportQueueQuery,
  database: Database = getDatabase(),
): Promise<ReportQueueResult> {
  const where = reportFilters(query);
  const [totalResult, rows] = await Promise.all([
    database
      .select({ value: count() })
      .from(aspirationReports)
      .leftJoin(
        reportAssignments,
        and(
          eq(reportAssignments.reportId, aspirationReports.id),
          isNull(reportAssignments.endedAt),
        ),
      )
      .where(where),
    database
      .select({
        archivedAt: aspirationReports.archivedAt,
        assigneeName: listAssignee.name,
        assignmentId: reportAssignments.id,
        assignmentAssigneeId: reportAssignments.assigneeUserId,
        assignmentRouteLabel: reportAssignments.routeLabel,
        categoryId: categories.id,
        categoryName: categories.name,
        id: aspirationReports.id,
        location: aspirationReports.location,
        status: aspirationReports.status,
        submittedAt: aspirationReports.submittedAt,
        title: aspirationReports.title,
        updatedAt: aspirationReports.updatedAt,
        urgency: aspirationReports.urgency,
      })
      .from(aspirationReports)
      .innerJoin(categories, eq(categories.id, aspirationReports.categoryId))
      .leftJoin(
        reportAssignments,
        and(
          eq(reportAssignments.reportId, aspirationReports.id),
          isNull(reportAssignments.endedAt),
        ),
      )
      .leftJoin(
        listAssignee,
        eq(listAssignee.id, reportAssignments.assigneeUserId),
      )
      .where(where)
      .orderBy(desc(aspirationReports.submittedAt), desc(aspirationReports.id))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize),
  ]);

  const totalItems = Number(totalResult[0]?.value ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalItems / query.pageSize));

  return {
    items: rows.map((row) => ({
      archivedAt: asIso(row.archivedAt),
      assignment: row.assignmentId
        ? {
            assigneeId: row.assignmentAssigneeId,
            assigneeName: row.assigneeName,
            id: row.assignmentId,
            routeLabel: row.assignmentRouteLabel ?? "Tidak ditentukan",
          }
        : null,
      category: { id: row.categoryId, name: row.categoryName },
      id: row.id,
      location: row.location,
      status: row.status,
      submittedAt: row.submittedAt.toISOString(),
      title: row.title,
      updatedAt: row.updatedAt.toISOString(),
      urgency: row.urgency,
    })),
    page: query.page,
    pageSize: query.pageSize,
    totalItems,
    totalPages,
  };
}

export async function listBemAssignees(
  database: CaseReadDatabase = getDatabase(),
): Promise<BemAssignee[]> {
  const rows = await database
    .select({
      email: bemUsers.email,
      id: bemUsers.id,
      name: bemUsers.name,
      role: bemUsers.role,
    })
    .from(bemUsers)
    .where(
      and(eq(bemUsers.status, "ACTIVE"), inArray(bemUsers.role, assigneeRoles)),
    )
    .orderBy(asc(bemUsers.name));

  return rows.map((row) => ({
    ...row,
    role: row.role as "ADVOCATE" | "ADMIN",
  }));
}

export async function getReportDetail(
  reportId: string,
  options: { includeAudit: boolean; includeRestricted: boolean },
  database: Database = getDatabase(),
): Promise<ReportDetail | null> {
  requireUuid(reportId, "reportId");

  const [report] = await database
    .select({
      archivedAt: aspirationReports.archivedAt,
      categoryId: categories.id,
      categoryName: categories.name,
      chronology: aspirationReports.chronology,
      id: aspirationReports.id,
      impact: aspirationReports.impact,
      internalSummary: aspirationReports.internalSummary,
      location: aspirationReports.location,
      resolvedAt: aspirationReports.resolvedAt,
      status: aspirationReports.status,
      submittedAt: aspirationReports.submittedAt,
      suggestedSolution: aspirationReports.suggestedSolution,
      title: aspirationReports.title,
      trackingCode: aspirationReports.trackingCode,
      updatedAt: aspirationReports.updatedAt,
      urgency: aspirationReports.urgency,
    })
    .from(aspirationReports)
    .innerJoin(categories, eq(categories.id, aspirationReports.categoryId))
    .where(eq(aspirationReports.id, reportId))
    .limit(1);

  if (!report) {
    return null;
  }

  const [statusEvents, notes, assignments, evidence, identity, audit] =
    await Promise.all([
      database
        .select({
          actorName: detailStatusActor.name,
          createdAt: reportStatusEvents.createdAt,
          fromStatus: reportStatusEvents.fromStatus,
          isReporterVisible: reportStatusEvents.isReporterVisible,
          reasonCode: reportStatusEvents.reasonCode,
          reporterMessage: reportStatusEvents.reporterMessage,
          toStatus: reportStatusEvents.toStatus,
        })
        .from(reportStatusEvents)
        .leftJoin(
          detailStatusActor,
          eq(detailStatusActor.id, reportStatusEvents.actorUserId),
        )
        .where(eq(reportStatusEvents.reportId, reportId))
        .orderBy(asc(reportStatusEvents.createdAt)),
      database
        .select({
          authorName: detailNoteAuthor.name,
          body: internalNotes.body,
          createdAt: internalNotes.createdAt,
          deletedAt: internalNotes.deletedAt,
          deletionReason: internalNotes.deletionReason,
          id: internalNotes.id,
          updatedAt: internalNotes.updatedAt,
        })
        .from(internalNotes)
        .innerJoin(
          detailNoteAuthor,
          eq(detailNoteAuthor.id, internalNotes.authorUserId),
        )
        .where(eq(internalNotes.reportId, reportId))
        .orderBy(desc(internalNotes.createdAt)),
      database
        .select({
          assigneeId: reportAssignments.assigneeUserId,
          assigneeName: detailAssignmentAssignee.name,
          assignedAt: reportAssignments.assignedAt,
          assignedByName: detailAssignmentAuthor.name,
          endedAt: reportAssignments.endedAt,
          id: reportAssignments.id,
          reason: reportAssignments.reason,
          routeLabel: reportAssignments.routeLabel,
        })
        .from(reportAssignments)
        .innerJoin(
          detailAssignmentAuthor,
          eq(detailAssignmentAuthor.id, reportAssignments.assignedByUserId),
        )
        .leftJoin(
          detailAssignmentAssignee,
          eq(detailAssignmentAssignee.id, reportAssignments.assigneeUserId),
        )
        .where(eq(reportAssignments.reportId, reportId))
        .orderBy(desc(reportAssignments.assignedAt)),
      options.includeRestricted
        ? database
            .select({
              checksumSha256: reportEvidence.checksumSha256,
              createdAt: reportEvidence.createdAt,
              id: reportEvidence.id,
              mimeType: reportEvidence.mimeType,
              originalFilename: reportEvidence.originalFilename,
              sizeBytes: reportEvidence.sizeBytes,
              validationStatus: reportEvidence.validationStatus,
            })
            .from(reportEvidence)
            .where(
              and(
                eq(reportEvidence.reportId, reportId),
                isNull(reportEvidence.deletedAt),
              ),
            )
            .orderBy(asc(reportEvidence.createdAt))
        : Promise.resolve([]),
      options.includeRestricted
        ? database
            .select({
              consentRecordedAt: reporterIdentities.consentRecordedAt,
              consentVersion: reporterIdentities.consentVersion,
              contactAllowed: reporterIdentities.contactAllowed,
              email: reporterIdentities.email,
              identityShareScope: reporterIdentities.identityShareScope,
              name: reporterIdentities.name,
              nim: reporterIdentities.nim,
              whatsapp: reporterIdentities.whatsapp,
            })
            .from(reporterIdentities)
            .where(
              and(
                eq(reporterIdentities.reportId, reportId),
                isNull(reporterIdentities.deletedAt),
              ),
            )
            .limit(1)
        : Promise.resolve([]),
      options.includeAudit
        ? database
            .select({
              action: auditEvents.action,
              actorName: detailAuditActor.name,
              occurredAt: auditEvents.occurredAt,
              reasonCode: auditEvents.reasonCode,
              result: auditEvents.result,
            })
            .from(auditEvents)
            .leftJoin(
              detailAuditActor,
              eq(detailAuditActor.id, auditEvents.actorUserId),
            )
            .where(
              and(
                eq(auditEvents.targetType, "ASPIRATION_REPORT"),
                eq(auditEvents.targetId, reportId),
              ),
            )
            .orderBy(desc(auditEvents.occurredAt))
        : Promise.resolve([]),
    ]);

  const assignmentRows = assignments as Array<{
    assigneeId: string | null;
    assigneeName: string | null;
    assignedAt: Date;
    assignedByName: string;
    endedAt: Date | null;
    id: string;
    reason: string | null;
    routeLabel: string;
  }>;

  return {
    assignments: assignmentRows.map((assignment) => ({
      assigneeId: assignment.assigneeId,
      assigneeName: assignment.assigneeName,
      assignedAt: assignment.assignedAt.toISOString(),
      assignedByName: assignment.assignedByName,
      endedAt: asIso(assignment.endedAt),
      id: assignment.id,
      reason: assignment.reason,
      routeLabel: assignment.routeLabel,
    })),
    audit: audit.map((event) => ({
      action: event.action,
      actorName: event.actorName,
      occurredAt: event.occurredAt.toISOString(),
      reasonCode: event.reasonCode,
      result: event.result,
    })),
    evidence: evidence.map((item) => ({
      checksumSha256: item.checksumSha256,
      createdAt: item.createdAt.toISOString(),
      id: item.id,
      mimeType: item.mimeType,
      originalFilename: item.originalFilename,
      sizeBytes: item.sizeBytes,
      validationStatus: item.validationStatus,
    })),
    identity: identity[0]
      ? {
          consentRecordedAt: asIso(identity[0].consentRecordedAt),
          consentVersion: identity[0].consentVersion,
          contactAllowed: identity[0].contactAllowed,
          email: identity[0].email,
          identityShareScope: identity[0].identityShareScope,
          name: identity[0].name,
          nim: identity[0].nim,
          whatsapp: identity[0].whatsapp,
        }
      : null,
    internalNotes: notes.map((note) => ({
      authorName: note.authorName,
      body: note.deletedAt ? null : note.body,
      createdAt: note.createdAt.toISOString(),
      deletedAt: asIso(note.deletedAt),
      deletionReason: note.deletionReason,
      id: note.id,
      updatedAt: note.updatedAt.toISOString(),
    })),
    report: {
      archivedAt: asIso(report.archivedAt),
      category: { id: report.categoryId, name: report.categoryName },
      chronology: report.chronology,
      id: report.id,
      impact: report.impact,
      internalSummary: report.internalSummary,
      location: report.location,
      resolvedAt: asIso(report.resolvedAt),
      status: report.status,
      submittedAt: report.submittedAt.toISOString(),
      suggestedSolution: report.suggestedSolution,
      title: report.title,
      trackingCode: report.trackingCode,
      updatedAt: report.updatedAt.toISOString(),
      urgency: report.urgency,
    },
    statusEvents: statusEvents.map((event) => ({
      actorName: event.actorName,
      createdAt: event.createdAt.toISOString(),
      fromStatus: event.fromStatus,
      isReporterVisible: event.isReporterVisible,
      reasonCode: event.reasonCode,
      reporterMessage: event.isReporterVisible ? event.reporterMessage : null,
      toStatus: event.toStatus,
    })),
  };
}

async function getReportForMutation(
  database: CaseReadDatabase,
  reportId: string,
  expectedUpdatedAt: string,
) {
  requireUuid(reportId, "reportId");
  const expected = expectedDate(expectedUpdatedAt);
  const [report] = await database
    .select({
      archivedAt: aspirationReports.archivedAt,
      categoryId: aspirationReports.categoryId,
      status: aspirationReports.status,
      updatedAt: aspirationReports.updatedAt,
    })
    .from(aspirationReports)
    .where(eq(aspirationReports.id, reportId))
    .limit(1);

  if (!report) {
    throw new CaseManagementError(
      "REPORT_NOT_FOUND",
      "Laporan tidak ditemukan.",
    );
  }

  if (report.updatedAt.getTime() !== expected.getTime()) {
    throw new CaseManagementError(
      "CONFLICT",
      "Laporan baru saja berubah. Muat ulang sebelum menyimpan lagi.",
    );
  }

  return { expected, report };
}

async function updateReportVersion(
  database: CaseWriteDatabase,
  reportId: string,
  expected: Date,
  values: Partial<{
    archivedAt: Date | null;
    categoryId: string;
    internalSummary: string | null;
    resolvedAt: Date | null;
    status: ReportStatus;
    urgency: ReportUrgency;
  }>,
  currentUpdatedAt: Date,
) {
  const updatedAt = nextVersion(currentUpdatedAt);
  const [updated] = await database
    .update(aspirationReports)
    .set({ ...values, updatedAt })
    .where(and(eq(aspirationReports.id, reportId), versionMatches(expected)))
    .returning({ updatedAt: aspirationReports.updatedAt });

  if (!updated) {
    throw new CaseManagementError(
      "CONFLICT",
      "Laporan baru saja berubah. Muat ulang sebelum menyimpan lagi.",
    );
  }

  return updated.updatedAt;
}

export type ChangeReportStatusInput = {
  actorUserId: string;
  expectedUpdatedAt: string;
  reasonCode?: string | null;
  reportId: string;
  reporterMessage?: string | null;
  toStatus: string;
};

export async function changeReportStatus(
  input: ChangeReportStatusInput,
  database: Database = getDatabase(),
) {
  if (!isOneOf(input.toStatus, reportStatuses)) {
    throw new CaseManagementError(
      "VALIDATION_ERROR",
      "Status tujuan tidak valid.",
    );
  }

  const toStatus = input.toStatus;

  const reporterMessage = optionalText(input.reporterMessage, 3000);
  const reasonCode =
    toStatus === "CANNOT_PROCESS"
      ? ensureReason(input.reasonCode)
      : input.reasonCode && isOneOf(input.reasonCode, reportReasonCodes)
        ? input.reasonCode
        : null;

  if (toStatus === "NEEDS_CLARIFICATION" && !reporterMessage) {
    throw new CaseManagementError(
      "VALIDATION_ERROR",
      "Tambahkan pesan untuk menjelaskan klarifikasi yang dibutuhkan.",
    );
  }

  return database.transaction(async (transaction) => {
    const { expected, report } = await getReportForMutation(
      transaction,
      input.reportId,
      input.expectedUpdatedAt,
    );

    if (report.archivedAt) {
      throw new CaseManagementError(
        "REPORT_ARCHIVED",
        "Laporan yang diarsipkan harus dibuka kembali terlebih dahulu.",
      );
    }

    if (report.status === toStatus && !reporterMessage) {
      throw new CaseManagementError(
        "NO_CHANGE",
        "Pilih status baru atau tambahkan pesan untuk pelapor.",
      );
    }

    if (!canTransitionReportStatus(report.status, toStatus)) {
      throw new CaseManagementError(
        "INVALID_TRANSITION",
        "Perubahan status tidak mengikuti alur laporan yang diizinkan.",
      );
    }

    const updatedAt = await updateReportVersion(
      transaction,
      input.reportId,
      expected,
      {
        ...(report.status !== toStatus ? { status: toStatus } : {}),
        ...(toStatus === "RESOLVED"
          ? { resolvedAt: new Date() }
          : report.status === "RESOLVED"
            ? { resolvedAt: null }
            : {}),
      },
      report.updatedAt,
    );

    await transaction.insert(reportStatusEvents).values({
      actorUserId: input.actorUserId,
      fromStatus: report.status,
      isReporterVisible: Boolean(reporterMessage),
      reasonCode,
      reportId: input.reportId,
      reporterMessage,
      toStatus,
    });

    await transaction.insert(auditEvents).values({
      action:
        report.status === toStatus
          ? "REPORT_REPORTER_MESSAGE_ADDED"
          : "REPORT_STATUS_CHANGED",
      actorType: "BEM_USER",
      actorUserId: input.actorUserId,
      metadata: {
        fromStatus: report.status,
        reporterMessageIncluded: Boolean(reporterMessage),
        toStatus,
      },
      reasonCode,
      result: "SUCCESS",
      targetId: input.reportId,
      targetType: "ASPIRATION_REPORT",
    });

    return { updatedAt };
  });
}

export type AddReporterMessageInput = {
  actorUserId: string;
  expectedUpdatedAt: string;
  message: string;
  reportId: string;
};

export async function addReporterMessage(
  input: AddReporterMessageInput,
  database: Database = getDatabase(),
) {
  const message = requireText(input.message, "message", 3000);

  return database.transaction(async (transaction) => {
    const { expected, report } = await getReportForMutation(
      transaction,
      input.reportId,
      input.expectedUpdatedAt,
    );

    if (report.archivedAt) {
      throw new CaseManagementError(
        "REPORT_ARCHIVED",
        "Laporan yang diarsipkan harus dibuka kembali terlebih dahulu.",
      );
    }

    const updatedAt = await updateReportVersion(
      transaction,
      input.reportId,
      expected,
      {},
      report.updatedAt,
    );

    await transaction.insert(reportStatusEvents).values({
      actorUserId: input.actorUserId,
      fromStatus: report.status,
      isReporterVisible: true,
      reportId: input.reportId,
      reporterMessage: message,
      toStatus: report.status,
    });

    await transaction.insert(auditEvents).values({
      action: "REPORT_REPORTER_MESSAGE_ADDED",
      actorType: "BEM_USER",
      actorUserId: input.actorUserId,
      metadata: { messageLength: message.length },
      result: "SUCCESS",
      targetId: input.reportId,
      targetType: "ASPIRATION_REPORT",
    });

    return { updatedAt };
  });
}

export type UpdateCaseFieldsInput = {
  actorUserId: string;
  categoryId?: string;
  expectedUpdatedAt: string;
  internalSummary?: string | null;
  reportId: string;
  urgency?: string;
};

export async function updateCaseFields(
  input: UpdateCaseFieldsInput,
  database: Database = getDatabase(),
) {
  if (input.urgency !== undefined && !isOneOf(input.urgency, reportUrgencies)) {
    throw new CaseManagementError("VALIDATION_ERROR", "Urgensi tidak valid.");
  }

  if (input.categoryId !== undefined) {
    requireUuid(input.categoryId, "categoryId");
  }

  const internalSummary =
    input.internalSummary === undefined
      ? undefined
      : optionalText(input.internalSummary, 3000);

  if (
    input.urgency === undefined &&
    input.categoryId === undefined &&
    input.internalSummary === undefined
  ) {
    throw new CaseManagementError("NO_CHANGE", "Tidak ada perubahan kasus.");
  }

  return database.transaction(async (transaction) => {
    const { expected, report } = await getReportForMutation(
      transaction,
      input.reportId,
      input.expectedUpdatedAt,
    );

    if (report.archivedAt) {
      throw new CaseManagementError(
        "REPORT_ARCHIVED",
        "Laporan yang diarsipkan harus dibuka kembali terlebih dahulu.",
      );
    }

    if (input.categoryId !== undefined) {
      const [category] = await transaction
        .select({ id: categories.id })
        .from(categories)
        .where(
          and(
            eq(categories.id, input.categoryId),
            eq(categories.isActive, true),
          ),
        )
        .limit(1);

      if (!category) {
        throw new CaseManagementError(
          "VALIDATION_ERROR",
          "Kategori aktif tidak ditemukan.",
        );
      }
    }

    const values = {
      ...(input.categoryId !== undefined
        ? { categoryId: input.categoryId }
        : {}),
      ...(input.internalSummary !== undefined ? { internalSummary } : {}),
      ...(input.urgency !== undefined ? { urgency: input.urgency } : {}),
    } as Partial<{
      categoryId: string;
      internalSummary: string | null;
      urgency: ReportUrgency;
    }>;

    const updatedAt = await updateReportVersion(
      transaction,
      input.reportId,
      expected,
      values,
      report.updatedAt,
    );

    await transaction.insert(auditEvents).values({
      action: "REPORT_CASE_FIELDS_UPDATED",
      actorType: "BEM_USER",
      actorUserId: input.actorUserId,
      metadata: {
        categoryChanged: input.categoryId !== undefined,
        internalSummaryChanged: input.internalSummary !== undefined,
        urgencyChanged: input.urgency !== undefined,
      },
      result: "SUCCESS",
      targetId: input.reportId,
      targetType: "ASPIRATION_REPORT",
    });

    return { updatedAt };
  });
}

export type AssignReportInput = {
  actorUserId: string;
  assigneeUserId: string;
  expectedUpdatedAt: string;
  reason?: string | null;
  reportId: string;
  routeLabel: string;
};

export async function assignReport(
  input: AssignReportInput,
  database: Database = getDatabase(),
) {
  requireUuid(input.assigneeUserId, "assigneeUserId");
  const routeLabel = requireText(input.routeLabel, "routeLabel", 160);
  const reason = optionalText(input.reason, 1000);

  return database.transaction(async (transaction) => {
    const { expected, report } = await getReportForMutation(
      transaction,
      input.reportId,
      input.expectedUpdatedAt,
    );

    if (report.archivedAt) {
      throw new CaseManagementError(
        "REPORT_ARCHIVED",
        "Laporan yang diarsipkan harus dibuka kembali terlebih dahulu.",
      );
    }

    const [assignee] = await transaction
      .select({ id: bemUsers.id })
      .from(bemUsers)
      .where(
        and(
          eq(bemUsers.id, input.assigneeUserId),
          eq(bemUsers.status, "ACTIVE"),
          inArray(bemUsers.role, assigneeRoles),
        ),
      )
      .limit(1);

    if (!assignee) {
      throw new CaseManagementError(
        "ASSIGNEE_NOT_FOUND",
        "PIC aktif tidak ditemukan.",
      );
    }

    const [current] = await transaction
      .select({
        assigneeUserId: reportAssignments.assigneeUserId,
        routeLabel: reportAssignments.routeLabel,
      })
      .from(reportAssignments)
      .where(
        and(
          eq(reportAssignments.reportId, input.reportId),
          isNull(reportAssignments.endedAt),
        ),
      )
      .limit(1);

    if (
      current?.assigneeUserId === input.assigneeUserId &&
      current.routeLabel === routeLabel
    ) {
      throw new CaseManagementError(
        "NO_CHANGE",
        "Assignment tersebut sudah aktif.",
      );
    }

    const updatedAt = await updateReportVersion(
      transaction,
      input.reportId,
      expected,
      {},
      report.updatedAt,
    );
    const now = new Date();

    if (current) {
      await transaction
        .update(reportAssignments)
        .set({ endedAt: now })
        .where(
          and(
            eq(reportAssignments.reportId, input.reportId),
            isNull(reportAssignments.endedAt),
          ),
        );
    }

    await transaction.insert(reportAssignments).values({
      assigneeUserId: input.assigneeUserId,
      assignedByUserId: input.actorUserId,
      reason,
      reportId: input.reportId,
      routeLabel,
    });

    await transaction.insert(auditEvents).values({
      action: "REPORT_ASSIGNMENT_CHANGED",
      actorType: "BEM_USER",
      actorUserId: input.actorUserId,
      metadata: {
        hadPreviousAssignment: Boolean(current),
        routeChanged: current?.routeLabel !== routeLabel,
      },
      result: "SUCCESS",
      targetId: input.reportId,
      targetType: "ASPIRATION_REPORT",
    });

    return { updatedAt };
  });
}

export type AddInternalNoteInput = {
  actorUserId: string;
  body: string;
  expectedUpdatedAt: string;
  reportId: string;
};

export async function addInternalNote(
  input: AddInternalNoteInput,
  database: Database = getDatabase(),
) {
  const body = requireText(input.body, "body", 5000);

  return database.transaction(async (transaction) => {
    const { expected, report } = await getReportForMutation(
      transaction,
      input.reportId,
      input.expectedUpdatedAt,
    );

    if (report.archivedAt) {
      throw new CaseManagementError(
        "REPORT_ARCHIVED",
        "Laporan yang diarsipkan harus dibuka kembali terlebih dahulu.",
      );
    }

    const updatedAt = await updateReportVersion(
      transaction,
      input.reportId,
      expected,
      {},
      report.updatedAt,
    );
    const [note] = await transaction
      .insert(internalNotes)
      .values({
        authorUserId: input.actorUserId,
        body,
        reportId: input.reportId,
      })
      .returning({ id: internalNotes.id });

    await transaction.insert(auditEvents).values({
      action: "REPORT_INTERNAL_NOTE_ADDED",
      actorType: "BEM_USER",
      actorUserId: input.actorUserId,
      metadata: { bodyLength: body.length },
      result: "SUCCESS",
      targetId: input.reportId,
      targetType: "ASPIRATION_REPORT",
    });

    return { noteId: note?.id ?? null, updatedAt };
  });
}

export type DeleteInternalNoteInput = {
  actorUserId: string;
  deletionReason: string;
  expectedUpdatedAt: string;
  noteId: string;
  reportId: string;
};

export async function deleteInternalNote(
  input: DeleteInternalNoteInput,
  database: Database = getDatabase(),
) {
  requireUuid(input.noteId, "noteId");
  const deletionReason = requireText(
    input.deletionReason,
    "deletionReason",
    500,
  );

  return database.transaction(async (transaction) => {
    const { expected, report } = await getReportForMutation(
      transaction,
      input.reportId,
      input.expectedUpdatedAt,
    );

    if (report.archivedAt) {
      throw new CaseManagementError(
        "REPORT_ARCHIVED",
        "Laporan yang diarsipkan harus dibuka kembali terlebih dahulu.",
      );
    }

    const updatedAt = await updateReportVersion(
      transaction,
      input.reportId,
      expected,
      {},
      report.updatedAt,
    );
    const [deleted] = await transaction
      .update(internalNotes)
      .set({ deletedAt: new Date(), deletionReason, updatedAt: new Date() })
      .where(
        and(
          eq(internalNotes.id, input.noteId),
          eq(internalNotes.reportId, input.reportId),
          isNull(internalNotes.deletedAt),
        ),
      )
      .returning({ id: internalNotes.id });

    if (!deleted) {
      throw new CaseManagementError(
        "NOTE_NOT_FOUND",
        "Catatan internal tidak ditemukan atau sudah dihapus.",
      );
    }

    await transaction.insert(auditEvents).values({
      action: "REPORT_INTERNAL_NOTE_DELETED",
      actorType: "BEM_USER",
      actorUserId: input.actorUserId,
      metadata: { deletionReasonLength: deletionReason.length },
      result: "SUCCESS",
      targetId: input.reportId,
      targetType: "ASPIRATION_REPORT",
    });

    return { updatedAt };
  });
}

export type ArchiveReportInput = {
  actorUserId: string;
  expectedUpdatedAt: string;
  reasonCode?: string | null;
  reportId: string;
};

export async function archiveReport(
  input: ArchiveReportInput,
  database: Database = getDatabase(),
) {
  const reasonCode = ensureReason(input.reasonCode);

  return database.transaction(async (transaction) => {
    const { expected, report } = await getReportForMutation(
      transaction,
      input.reportId,
      input.expectedUpdatedAt,
    );

    if (report.archivedAt) {
      throw new CaseManagementError("NO_CHANGE", "Laporan sudah diarsipkan.");
    }

    const updatedAt = await updateReportVersion(
      transaction,
      input.reportId,
      expected,
      { archivedAt: new Date() },
      report.updatedAt,
    );

    await transaction.insert(auditEvents).values({
      action: "REPORT_ARCHIVED",
      actorType: "BEM_USER",
      actorUserId: input.actorUserId,
      reasonCode,
      result: "SUCCESS",
      targetId: input.reportId,
      targetType: "ASPIRATION_REPORT",
    });

    return { updatedAt };
  });
}

export type ReopenReportInput = {
  actorUserId: string;
  expectedUpdatedAt: string;
  reasonCode?: string | null;
  reportId: string;
  reporterMessage?: string | null;
};

export async function reopenReport(
  input: ReopenReportInput,
  database: Database = getDatabase(),
) {
  const reasonCode = ensureReason(input.reasonCode);
  const reporterMessage = optionalText(input.reporterMessage, 3000);

  return database.transaction(async (transaction) => {
    const { expected, report } = await getReportForMutation(
      transaction,
      input.reportId,
      input.expectedUpdatedAt,
    );

    if (!report.archivedAt) {
      throw new CaseManagementError(
        "NO_CHANGE",
        "Hanya laporan yang diarsipkan yang dapat dibuka kembali.",
      );
    }

    const updatedAt = await updateReportVersion(
      transaction,
      input.reportId,
      expected,
      { archivedAt: null, resolvedAt: null, status: "UNDER_REVIEW" },
      report.updatedAt,
    );

    await transaction.insert(reportStatusEvents).values({
      actorUserId: input.actorUserId,
      fromStatus: report.status,
      isReporterVisible: Boolean(reporterMessage),
      reasonCode,
      reportId: input.reportId,
      reporterMessage,
      toStatus: "UNDER_REVIEW",
    });

    await transaction.insert(auditEvents).values({
      action: "REPORT_REOPENED",
      actorType: "BEM_USER",
      actorUserId: input.actorUserId,
      metadata: { reporterMessageIncluded: Boolean(reporterMessage) },
      reasonCode,
      result: "SUCCESS",
      targetId: input.reportId,
      targetType: "ASPIRATION_REPORT",
    });

    return { updatedAt };
  });
}
