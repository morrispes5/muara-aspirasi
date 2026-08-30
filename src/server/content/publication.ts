import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  or,
} from "drizzle-orm";

import {
  advocacyUpdateReports,
  advocacyUpdates,
  aspirationReports,
  auditEvents,
  categories,
  studentInfoPosts,
} from "@/server/db/schema";
import { type Database, getDatabase } from "@/server/db/client";
import type { PublicArticle, PublicArticleSummary } from "@/lib/public-content";

export const contentKinds = ["advocacy", "student-info"] as const;
export type ContentKind = (typeof contentKinds)[number];

export const advocacyStatuses = [
  "DRAFT",
  "IN_REVIEW",
  "PUBLISHED",
  "ARCHIVED",
] as const;
export type AdvocacyPublicationStatus = (typeof advocacyStatuses)[number];

export const studentInfoStatuses = [
  "DRAFT",
  "IN_REVIEW",
  "SCHEDULED",
  "PUBLISHED",
  "ARCHIVED",
] as const;
export type StudentInfoPublicationStatus = (typeof studentInfoStatuses)[number];

export const studentInfoCategories = [
  "ACADEMIC",
  "FACILITIES",
  "OPPORTUNITY",
  "EVENT",
  "SERVICE",
  "ANNOUNCEMENT",
] as const;
export type StudentInfoCategory = (typeof studentInfoCategories)[number];

export const studentInfoCategoryLabels: Record<StudentInfoCategory, string> = {
  ACADEMIC: "Akademik",
  ANNOUNCEMENT: "Pengumuman",
  EVENT: "Acara",
  FACILITIES: "Fasilitas",
  OPPORTUNITY: "Kesempatan",
  SERVICE: "Layanan",
};

export const publicationActions = [
  "save_draft",
  "submit_review",
  "publish",
  "archive",
] as const;
export type PublicationAction = (typeof publicationActions)[number];

export type ContentFormInput = {
  body: string;
  categoryId?: string;
  category?: string;
  isPinned?: boolean;
  progressLabel?: string;
  reportIds?: string[];
  slug: string;
  sourceCredit?: string;
  sourceUrl?: string;
  summary: string;
  title: string;
};

export type AdvocacyForm = {
  body: string;
  categoryId: string;
  progressLabel: string;
  slug: string;
  sourceCredit: string | null;
  summary: string;
  title: string;
};

export type StudentInfoForm = {
  body: string;
  category: StudentInfoCategory;
  isPinned: boolean;
  slug: string;
  sourceCredit: string | null;
  sourceUrl: string | null;
  summary: string;
  title: string;
};

export type PublicContentResult = {
  items: PublicArticleSummary[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type AdminContentItem = PublicArticle & {
  authorUserId: string;
  categoryId?: string;
  categoryValue?: StudentInfoCategory;
  createdAt: string;
  id: string;
  publicationStatus:
    "DRAFT" | "IN_REVIEW" | "PUBLISHED" | "ARCHIVED" | "SCHEDULED";
  updatedAt: string;
};

export type AdminContentResult = {
  items: AdminContentItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

type ContentServiceErrorCode =
  | "CONFLICT"
  | "INVALID_ACTION"
  | "INVALID_INPUT"
  | "INVALID_TRANSITION"
  | "NOT_FOUND"
  | "SLUG_TAKEN";

export class ContentServiceError extends Error {
  constructor(
    public readonly code: ContentServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ContentServiceError";
  }
}

const defaultPageSize = 12;
const maxPageSize = 50;

function pagination(page: number | undefined, pageSize: number | undefined) {
  const safePage =
    Number.isInteger(page) && (page as number) > 0
      ? Math.min(page as number, 1000)
      : 1;
  const safePageSize =
    Number.isInteger(pageSize) && (pageSize as number) > 0
      ? Math.min(pageSize as number, maxPageSize)
      : defaultPageSize;
  return { safePage, safePageSize };
}

function pageResult(page: number, pageSize: number, totalItems: number) {
  return {
    page,
    pageSize,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
  };
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    timeZone: "Asia/Jakarta",
    year: "numeric",
  }).format(value);
}

function readingTime(body: string): string {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.ceil(words / 180))} menit baca`;
}

function text(value: unknown, field: string, max: number, min = 1): string {
  if (typeof value !== "string") {
    throw new ContentServiceError("INVALID_INPUT", `${field} wajib diisi.`);
  }

  const normalized = value.trim();
  if (normalized.length < min || normalized.length > max) {
    throw new ContentServiceError(
      "INVALID_INPUT",
      `${field} harus memiliki ${min}-${max} karakter.`,
    );
  }

  return normalized;
}

function plainBody(value: unknown): string {
  const normalized = text(value, "Isi konten", 12000, 20);
  if (/[<>]/.test(normalized)) {
    throw new ContentServiceError(
      "INVALID_INPUT",
      "Isi konten harus berupa teks biasa tanpa tag HTML.",
    );
  }
  return normalized;
}

function optionalText(
  value: unknown,
  field: string,
  max: number,
): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return text(value, field, max);
}

function slug(value: unknown): string {
  const normalized = text(value, "Slug", 120, 3).toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) {
    throw new ContentServiceError(
      "INVALID_INPUT",
      "Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung.",
    );
  }
  return normalized;
}

function url(value: unknown): string | null {
  const normalized = optionalText(value, "URL sumber", 2048);
  if (!normalized) {
    return null;
  }

  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("unsafe protocol");
    }
  } catch {
    throw new ContentServiceError(
      "INVALID_INPUT",
      "URL sumber harus menggunakan http atau https.",
    );
  }

  return normalized;
}

function uuid(value: unknown, field: string): string {
  const normalized = text(value, field, 36, 36);
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      normalized,
    )
  ) {
    throw new ContentServiceError("INVALID_INPUT", `${field} tidak valid.`);
  }
  return normalized;
}

function reportIds(value: unknown): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value) || value.length > 20) {
    throw new ContentServiceError(
      "INVALID_INPUT",
      "Maksimal 20 laporan dapat ditautkan.",
    );
  }
  const unique = [...new Set(value)];
  return unique.map((item) => uuid(item, "ID laporan"));
}

function expectedDate(value: unknown): Date {
  if (typeof value !== "string") {
    throw new ContentServiceError("INVALID_INPUT", "Versi konten diperlukan.");
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ContentServiceError("INVALID_INPUT", "Versi konten tidak valid.");
  }
  return parsed;
}

function booleanValue(value: unknown): boolean {
  if (value === undefined || value === null) {
    return false;
  }
  if (typeof value !== "boolean") {
    throw new ContentServiceError("INVALID_INPUT", "Status pin tidak valid.");
  }
  return value;
}

function parseForm(kind: "advocacy", input: ContentFormInput): AdvocacyForm;
function parseForm(
  kind: "student-info",
  input: ContentFormInput,
): StudentInfoForm;
function parseForm(
  kind: ContentKind,
  input: ContentFormInput,
): AdvocacyForm | StudentInfoForm;
function parseForm(
  kind: ContentKind,
  input: ContentFormInput,
): AdvocacyForm | StudentInfoForm {
  const normalized = {
    body: plainBody(input.body),
    slug: slug(input.slug),
    summary: text(input.summary, "Ringkasan", 1000, 10),
    title: text(input.title, "Judul", 200, 3),
  };

  if (kind === "advocacy") {
    return {
      ...normalized,
      categoryId: uuid(input.categoryId, "Kategori"),
      progressLabel: text(input.progressLabel, "Label progres", 120, 2),
      sourceCredit: optionalText(input.sourceCredit, "Kredit sumber", 500),
    };
  }

  if (
    typeof input.category !== "string" ||
    !studentInfoCategories.includes(input.category as StudentInfoCategory)
  ) {
    throw new ContentServiceError(
      "INVALID_INPUT",
      "Kategori info tidak valid.",
    );
  }

  return {
    ...normalized,
    category: input.category as StudentInfoCategory,
    isPinned: booleanValue(input.isPinned),
    sourceCredit: optionalText(input.sourceCredit, "Kredit sumber", 500),
    sourceUrl: url(input.sourceUrl),
  };
}

export function validateContentInput(
  kind: "advocacy",
  input: ContentFormInput,
): AdvocacyForm;
export function validateContentInput(
  kind: "student-info",
  input: ContentFormInput,
): StudentInfoForm;
export function validateContentInput(
  kind: ContentKind,
  input: ContentFormInput,
): AdvocacyForm | StudentInfoForm {
  return parseForm(kind, input);
}

function iso(value: Date): string {
  return value.toISOString();
}

function toPublicAdvocacy(row: {
  body: string;
  categoryName: string;
  progressLabel: string;
  publishedAt: Date;
  slug: string;
  sourceCredit: string | null;
  summary: string;
  title: string;
}): PublicArticle {
  return {
    body: row.body,
    category: row.categoryName,
    date: formatDate(row.publishedAt),
    excerpt: row.summary,
    progressLabel: row.progressLabel,
    readTime: readingTime(row.body),
    slug: row.slug,
    sourceCredit: row.sourceCredit,
    title: row.title,
  };
}

function toPublicStudentInfo(row: {
  body: string;
  category: StudentInfoCategory;
  isPinned: boolean;
  publishedAt: Date;
  slug: string;
  sourceCredit: string | null;
  sourceUrl: string | null;
  summary: string;
  title: string;
}): PublicArticle {
  return {
    body: row.body,
    category: studentInfoCategoryLabels[row.category],
    date: formatDate(row.publishedAt),
    excerpt: row.summary,
    isPinned: row.isPinned,
    readTime: readingTime(row.body),
    slug: row.slug,
    sourceCredit: row.sourceCredit,
    sourceUrl: row.sourceUrl,
    title: row.title,
  };
}

function toPublicSummary(article: PublicArticle): PublicArticleSummary {
  const { body, ...summary } = article;
  void body;
  return summary;
}

export function parseContentKind(value: string): ContentKind {
  if (!contentKinds.includes(value as ContentKind)) {
    throw new ContentServiceError("INVALID_INPUT", "Jenis konten tidak valid.");
  }
  return value as ContentKind;
}

export function parseContentAction(value: unknown): PublicationAction {
  if (!publicationActions.includes(value as PublicationAction)) {
    throw new ContentServiceError(
      "INVALID_ACTION",
      "Aksi publikasi tidak valid.",
    );
  }
  return value as PublicationAction;
}

export function canTransitionPublication(
  kind: ContentKind,
  from: string,
  action: PublicationAction,
): boolean {
  if (action === "save_draft") {
    return from !== "ARCHIVED";
  }
  if (action === "submit_review") {
    return from === "DRAFT";
  }
  if (action === "publish") {
    return from === "IN_REVIEW";
  }
  if (action === "archive") {
    return from === "PUBLISHED";
  }
  return false;
}

function assertTransition(
  kind: ContentKind,
  from: string,
  action: PublicationAction,
) {
  if (!canTransitionPublication(kind, from, action)) {
    throw new ContentServiceError(
      "INVALID_TRANSITION",
      "Status konten tidak mengizinkan aksi tersebut.",
    );
  }
}

function targetType(kind: ContentKind) {
  return kind === "advocacy" ? "ADVOCACY_UPDATE" : "STUDENT_INFO_POST";
}

function auditAction(action: PublicationAction, isNew = false) {
  if (isNew) return "CONTENT_DRAFT_SAVED";
  if (action === "save_draft") return "CONTENT_EDITED";
  if (action === "submit_review") return "CONTENT_SUBMITTED_REVIEW";
  if (action === "publish") return "CONTENT_PUBLISHED";
  return "CONTENT_ARCHIVED";
}

type AdminQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
};

type ContentReadDatabase = Pick<Database, "select">;

function adminFilters(
  kind: ContentKind,
  query: AdminQuery,
  table: typeof advocacyUpdates | typeof studentInfoPosts,
) {
  const filters = [];
  if (query.status && query.status !== "ALL") {
    filters.push(eq(table.publicationStatus, query.status as never));
  }
  if (query.search) {
    const search = `%${query.search.trim().slice(0, 100)}%`;
    filters.push(or(ilike(table.title, search), ilike(table.slug, search)));
  }
  return filters.length ? and(...filters) : undefined;
}

function assertAdminStatus(kind: ContentKind, status: string | undefined) {
  if (!status || status === "ALL") return;
  const valid =
    kind === "advocacy"
      ? advocacyStatuses.includes(status as AdvocacyPublicationStatus)
      : studentInfoStatuses.includes(status as StudentInfoPublicationStatus);
  if (!valid) {
    throw new ContentServiceError(
      "INVALID_INPUT",
      "Status konten tidak valid.",
    );
  }
}

export async function listAdminContent(
  kind: ContentKind,
  query: AdminQuery = {},
  database: ContentReadDatabase = getDatabase(),
): Promise<AdminContentResult> {
  assertAdminStatus(kind, query.status);
  const { safePage, safePageSize } = pagination(query.page, query.pageSize);

  if (kind === "advocacy") {
    const where = adminFilters(kind, query, advocacyUpdates);
    const [rows, total] = await Promise.all([
      database
        .select({
          authorUserId: advocacyUpdates.authorUserId,
          body: advocacyUpdates.body,
          categoryId: advocacyUpdates.categoryId,
          categoryName: categories.name,
          createdAt: advocacyUpdates.createdAt,
          id: advocacyUpdates.id,
          progressLabel: advocacyUpdates.progressLabel,
          publicationStatus: advocacyUpdates.publicationStatus,
          publishedAt: advocacyUpdates.publishedAt,
          slug: advocacyUpdates.slug,
          sourceCredit: advocacyUpdates.sourceCredit,
          summary: advocacyUpdates.summary,
          title: advocacyUpdates.title,
          updatedAt: advocacyUpdates.updatedAt,
        })
        .from(advocacyUpdates)
        .innerJoin(categories, eq(advocacyUpdates.categoryId, categories.id))
        .where(where)
        .orderBy(desc(advocacyUpdates.updatedAt))
        .limit(safePageSize)
        .offset((safePage - 1) * safePageSize),
      database.select({ value: count() }).from(advocacyUpdates).where(where),
    ]);

    const totalItems = Number(total[0]?.value ?? 0);
    return {
      items: rows.map((row) => ({
        ...toPublicAdvocacy({
          ...row,
          publishedAt: row.publishedAt ?? row.updatedAt,
        }),
        authorUserId: row.authorUserId,
        categoryId: row.categoryId,
        createdAt: iso(row.createdAt),
        id: row.id,
        publicationStatus: row.publicationStatus,
        updatedAt: iso(row.updatedAt),
      })),
      ...pageResult(safePage, safePageSize, totalItems),
    };
  }

  const where = adminFilters(kind, query, studentInfoPosts);
  const [rows, total] = await Promise.all([
    database
      .select()
      .from(studentInfoPosts)
      .where(where)
      .orderBy(desc(studentInfoPosts.updatedAt))
      .limit(safePageSize)
      .offset((safePage - 1) * safePageSize),
    database.select({ value: count() }).from(studentInfoPosts).where(where),
  ]);
  const totalItems = Number(total[0]?.value ?? 0);

  return {
    items: rows.map((row) => ({
      ...toPublicStudentInfo({
        ...row,
        category: row.category as StudentInfoCategory,
        publishedAt: row.publishedAt ?? row.updatedAt,
      }),
      authorUserId: row.authorUserId,
      categoryValue: row.category as StudentInfoCategory,
      isPinned: row.isPinned,
      createdAt: iso(row.createdAt),
      id: row.id,
      publicationStatus: row.publicationStatus,
      updatedAt: iso(row.updatedAt),
    })),
    ...pageResult(safePage, safePageSize, totalItems),
  };
}

export async function listPublishedContent(
  kind: ContentKind,
  query: { category?: string; page?: number; pageSize?: number } = {},
  database: ContentReadDatabase = getDatabase(),
): Promise<PublicContentResult> {
  const { safePage, safePageSize } = pagination(query.page, query.pageSize);

  if (kind === "advocacy") {
    const filters = [
      eq(advocacyUpdates.publicationStatus, "PUBLISHED"),
      isNotNull(advocacyUpdates.publishedAt),
    ];
    if (query.category) filters.push(eq(categories.slug, query.category));
    const where = and(...filters);
    const [rows, total] = await Promise.all([
      database
        .select({
          body: advocacyUpdates.body,
          categoryName: categories.name,
          progressLabel: advocacyUpdates.progressLabel,
          publishedAt: advocacyUpdates.publishedAt,
          slug: advocacyUpdates.slug,
          sourceCredit: advocacyUpdates.sourceCredit,
          summary: advocacyUpdates.summary,
          title: advocacyUpdates.title,
        })
        .from(advocacyUpdates)
        .innerJoin(categories, eq(advocacyUpdates.categoryId, categories.id))
        .where(where)
        .orderBy(desc(advocacyUpdates.publishedAt), asc(advocacyUpdates.slug))
        .limit(safePageSize)
        .offset((safePage - 1) * safePageSize),
      database
        .select({ value: count() })
        .from(advocacyUpdates)
        .innerJoin(categories, eq(advocacyUpdates.categoryId, categories.id))
        .where(where),
    ]);
    const totalItems = Number(total[0]?.value ?? 0);
    return {
      items: rows.map((row) =>
        toPublicSummary(
          toPublicAdvocacy({ ...row, publishedAt: row.publishedAt as Date }),
        ),
      ),
      ...pageResult(safePage, safePageSize, totalItems),
    };
  }

  if (
    query.category &&
    !studentInfoCategories.includes(query.category as StudentInfoCategory)
  ) {
    return {
      items: [],
      ...pageResult(safePage, safePageSize, 0),
    };
  }

  const filters = [
    eq(studentInfoPosts.publicationStatus, "PUBLISHED"),
    isNotNull(studentInfoPosts.publishedAt),
  ];
  if (query.category) {
    filters.push(
      eq(studentInfoPosts.category, query.category as StudentInfoCategory),
    );
  }
  const where = and(...filters);
  const [rows, total] = await Promise.all([
    database
      .select()
      .from(studentInfoPosts)
      .where(where)
      .orderBy(
        desc(studentInfoPosts.isPinned),
        desc(studentInfoPosts.publishedAt),
        asc(studentInfoPosts.slug),
      )
      .limit(safePageSize)
      .offset((safePage - 1) * safePageSize),
    database.select({ value: count() }).from(studentInfoPosts).where(where),
  ]);
  const totalItems = Number(total[0]?.value ?? 0);
  return {
    items: rows.map((row) =>
      toPublicSummary(
        toPublicStudentInfo({
          ...row,
          category: row.category as StudentInfoCategory,
          publishedAt: row.publishedAt as Date,
        }),
      ),
    ),
    ...pageResult(safePage, safePageSize, totalItems),
  };
}

export async function getPublishedContent(
  kind: ContentKind,
  contentSlug: string,
  database: ContentReadDatabase = getDatabase(),
): Promise<PublicArticle | null> {
  if (kind === "advocacy") {
    const [row] = await database
      .select({
        body: advocacyUpdates.body,
        categoryName: categories.name,
        progressLabel: advocacyUpdates.progressLabel,
        publishedAt: advocacyUpdates.publishedAt,
        slug: advocacyUpdates.slug,
        sourceCredit: advocacyUpdates.sourceCredit,
        summary: advocacyUpdates.summary,
        title: advocacyUpdates.title,
      })
      .from(advocacyUpdates)
      .innerJoin(categories, eq(advocacyUpdates.categoryId, categories.id))
      .where(
        and(
          eq(advocacyUpdates.slug, contentSlug),
          eq(advocacyUpdates.publicationStatus, "PUBLISHED"),
          isNotNull(advocacyUpdates.publishedAt),
        ),
      )
      .limit(1);
    return row?.publishedAt
      ? toPublicAdvocacy({ ...row, publishedAt: row.publishedAt })
      : null;
  }

  const [row] = await database
    .select()
    .from(studentInfoPosts)
    .where(
      and(
        eq(studentInfoPosts.slug, contentSlug),
        eq(studentInfoPosts.publicationStatus, "PUBLISHED"),
        isNotNull(studentInfoPosts.publishedAt),
      ),
    )
    .limit(1);
  return row?.publishedAt
    ? toPublicStudentInfo({
        ...row,
        category: row.category as StudentInfoCategory,
        publishedAt: row.publishedAt,
      })
    : null;
}

export async function getAdminContent(
  kind: ContentKind,
  id: string,
  database: ContentReadDatabase = getDatabase(),
): Promise<AdminContentItem | null> {
  uuid(id, "Content ID");
  if (kind === "advocacy") {
    const [row] = await database
      .select({
        authorUserId: advocacyUpdates.authorUserId,
        body: advocacyUpdates.body,
        categoryId: advocacyUpdates.categoryId,
        categoryName: categories.name,
        createdAt: advocacyUpdates.createdAt,
        id: advocacyUpdates.id,
        progressLabel: advocacyUpdates.progressLabel,
        publicationStatus: advocacyUpdates.publicationStatus,
        publishedAt: advocacyUpdates.publishedAt,
        slug: advocacyUpdates.slug,
        sourceCredit: advocacyUpdates.sourceCredit,
        summary: advocacyUpdates.summary,
        title: advocacyUpdates.title,
        updatedAt: advocacyUpdates.updatedAt,
      })
      .from(advocacyUpdates)
      .innerJoin(categories, eq(advocacyUpdates.categoryId, categories.id))
      .where(eq(advocacyUpdates.id, id))
      .limit(1);
    if (!row) return null;
    return {
      ...toPublicAdvocacy({
        ...row,
        publishedAt: row.publishedAt ?? row.updatedAt,
      }),
      authorUserId: row.authorUserId,
      categoryId: row.categoryId,
      createdAt: iso(row.createdAt),
      id: row.id,
      publicationStatus: row.publicationStatus,
      updatedAt: iso(row.updatedAt),
    };
  }

  const [row] = await database
    .select()
    .from(studentInfoPosts)
    .where(eq(studentInfoPosts.id, id))
    .limit(1);
  if (!row) return null;
  return {
    ...toPublicStudentInfo({
      ...row,
      category: row.category as StudentInfoCategory,
      publishedAt: row.publishedAt ?? row.updatedAt,
    }),
    authorUserId: row.authorUserId,
    categoryValue: row.category as StudentInfoCategory,
    createdAt: iso(row.createdAt),
    id: row.id,
    publicationStatus: row.publicationStatus,
    updatedAt: iso(row.updatedAt),
  };
}

async function ensureSlugAvailable(
  kind: ContentKind,
  contentSlug: string,
  id: string | null,
  database: Pick<Database, "select">,
) {
  const table = kind === "advocacy" ? advocacyUpdates : studentInfoPosts;
  const [existing] = await database
    .select({ id: table.id })
    .from(table)
    .where(eq(table.slug, contentSlug))
    .limit(1);
  if (existing && existing.id !== id) {
    throw new ContentServiceError(
      "SLUG_TAKEN",
      "Slug sudah digunakan konten lain.",
    );
  }
}

async function ensureAdvocacyCategory(
  categoryId: string,
  database: Pick<Database, "select">,
) {
  const [category] = await database
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.id, categoryId))
    .limit(1);
  if (!category) {
    throw new ContentServiceError("INVALID_INPUT", "Kategori tidak ditemukan.");
  }
}

async function syncAdvocacyReports(
  advocacyUpdateId: string,
  linkedReportIds: string[] | undefined,
  actorUserId: string,
  database: Pick<Database, "delete" | "insert" | "select">,
) {
  if (linkedReportIds === undefined) return;

  if (linkedReportIds.length) {
    const existing = await database
      .select({ id: aspirationReports.id })
      .from(aspirationReports)
      .where(inArray(aspirationReports.id, linkedReportIds));
    if (existing.length !== linkedReportIds.length) {
      throw new ContentServiceError(
        "INVALID_INPUT",
        "Satu atau beberapa ID laporan tidak ditemukan.",
      );
    }
  }

  await database
    .delete(advocacyUpdateReports)
    .where(eq(advocacyUpdateReports.advocacyUpdateId, advocacyUpdateId));

  if (linkedReportIds.length) {
    await database.insert(advocacyUpdateReports).values(
      linkedReportIds.map((reportId) => ({
        advocacyUpdateId,
        linkedByUserId: actorUserId,
        reportId,
      })),
    );
  }
}

export async function createContent(
  kind: ContentKind,
  input: ContentFormInput,
  actorUserId: string,
  database: Database = getDatabase(),
): Promise<AdminContentItem> {
  return database.transaction(async (transaction) => {
    const normalized = parseForm(kind, input);
    await ensureSlugAvailable(kind, normalized.slug, null, transaction);
    const now = new Date();
    if (kind === "advocacy") {
      const advocacy = parseForm("advocacy", input);
      const linkedReportIds = reportIds(input.reportIds);
      await ensureAdvocacyCategory(advocacy.categoryId, transaction);
      const [created] = await transaction
        .insert(advocacyUpdates)
        .values({
          authorUserId: actorUserId,
          body: advocacy.body,
          categoryId: advocacy.categoryId,
          progressLabel: advocacy.progressLabel,
          slug: advocacy.slug,
          sourceCredit: advocacy.sourceCredit,
          summary: advocacy.summary,
          title: advocacy.title,
          updatedAt: now,
        })
        .onConflictDoNothing({ target: advocacyUpdates.slug })
        .returning({ id: advocacyUpdates.id });
      if (!created)
        throw new ContentServiceError(
          "SLUG_TAKEN",
          "Slug sudah digunakan konten lain.",
        );
      await syncAdvocacyReports(
        created.id,
        linkedReportIds,
        actorUserId,
        transaction,
      );
      await transaction.insert(auditEvents).values({
        action: auditAction("save_draft", true),
        actorType: "BEM_USER",
        actorUserId,
        metadata: { contentKind: kind },
        result: "SUCCESS",
        targetId: created.id,
        targetType: targetType(kind),
      });
      return (await getAdminContent(
        kind,
        created.id,
        transaction,
      )) as AdminContentItem;
    }

    const studentInfo = parseForm("student-info", input);
    const [created] = await transaction
      .insert(studentInfoPosts)
      .values({
        authorUserId: actorUserId,
        body: studentInfo.body,
        category: studentInfo.category,
        isPinned: studentInfo.isPinned,
        slug: studentInfo.slug,
        sourceCredit: studentInfo.sourceCredit,
        sourceUrl: studentInfo.sourceUrl,
        summary: studentInfo.summary,
        title: studentInfo.title,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: studentInfoPosts.slug })
      .returning({ id: studentInfoPosts.id });
    if (!created)
      throw new ContentServiceError(
        "SLUG_TAKEN",
        "Slug sudah digunakan konten lain.",
      );
    await transaction.insert(auditEvents).values({
      action: auditAction("save_draft", true),
      actorType: "BEM_USER",
      actorUserId,
      metadata: { contentKind: kind },
      result: "SUCCESS",
      targetId: created.id,
      targetType: targetType(kind),
    });
    return (await getAdminContent(
      kind,
      created.id,
      transaction,
    )) as AdminContentItem;
  });
}

export async function mutateContent(
  kind: ContentKind,
  id: string,
  action: PublicationAction,
  input: ContentFormInput,
  expectedUpdatedAt: string,
  actorUserId: string,
  database: Database = getDatabase(),
): Promise<AdminContentItem> {
  uuid(id, "Content ID");
  const expected = expectedDate(expectedUpdatedAt);
  return database.transaction(async (transaction) => {
    const normalized = parseForm(kind, input);
    await ensureSlugAvailable(kind, normalized.slug, id, transaction);
    if (kind === "advocacy") {
      const advocacy = parseForm("advocacy", input);
      const linkedReportIds = reportIds(input.reportIds);
      await ensureAdvocacyCategory(advocacy.categoryId, transaction);
      const [current] = await transaction
        .select()
        .from(advocacyUpdates)
        .where(eq(advocacyUpdates.id, id))
        .limit(1);
      if (!current)
        throw new ContentServiceError("NOT_FOUND", "Konten tidak ditemukan.");
      if (current.updatedAt.getTime() !== expected.getTime()) {
        throw new ContentServiceError(
          "CONFLICT",
          "Konten baru saja berubah. Muat ulang terlebih dahulu.",
        );
      }
      assertTransition(kind, current.publicationStatus, action);
      const now = new Date();
      const values = {
        body: advocacy.body,
        categoryId: advocacy.categoryId,
        progressLabel: advocacy.progressLabel,
        slug: advocacy.slug,
        sourceCredit: advocacy.sourceCredit,
        summary: advocacy.summary,
        title: advocacy.title,
        updatedAt: now,
        ...(action === "save_draft" && current.publicationStatus !== "DRAFT"
          ? { publicationStatus: "DRAFT" as const }
          : {}),
        ...(action === "submit_review"
          ? { publicationStatus: "IN_REVIEW" as const }
          : {}),
        ...(action === "publish"
          ? {
              publicationStatus: "PUBLISHED" as const,
              publishedAt: now,
              publishedByUserId: actorUserId,
              reviewerUserId: actorUserId,
            }
          : {}),
        ...(action === "archive"
          ? { archivedAt: now, publicationStatus: "ARCHIVED" as const }
          : {}),
      };
      const [updated] = await transaction
        .update(advocacyUpdates)
        .set(values)
        .where(
          and(
            eq(advocacyUpdates.id, id),
            eq(advocacyUpdates.updatedAt, expected),
          ),
        )
        .returning({ id: advocacyUpdates.id });
      if (!updated)
        throw new ContentServiceError(
          "CONFLICT",
          "Konten berubah sebelum disimpan.",
        );
      await syncAdvocacyReports(id, linkedReportIds, actorUserId, transaction);
      await transaction.insert(auditEvents).values({
        action: auditAction(action),
        actorType: "BEM_USER",
        actorUserId,
        metadata: {
          contentKind: kind,
          ...(linkedReportIds
            ? { linkedReportCount: linkedReportIds.length }
            : {}),
          publicationStatus:
            values.publicationStatus ?? current.publicationStatus,
        },
        result: "SUCCESS",
        targetId: id,
        targetType: targetType(kind),
      });
      return (await getAdminContent(kind, id, transaction)) as AdminContentItem;
    }

    const studentInfo = parseForm("student-info", input);
    const [current] = await transaction
      .select()
      .from(studentInfoPosts)
      .where(eq(studentInfoPosts.id, id))
      .limit(1);
    if (!current)
      throw new ContentServiceError("NOT_FOUND", "Konten tidak ditemukan.");
    if (current.updatedAt.getTime() !== expected.getTime()) {
      throw new ContentServiceError(
        "CONFLICT",
        "Konten baru saja berubah. Muat ulang terlebih dahulu.",
      );
    }
    assertTransition(kind, current.publicationStatus, action);
    const now = new Date();
    const values = {
      body: studentInfo.body,
      category: studentInfo.category,
      isPinned: studentInfo.isPinned,
      slug: studentInfo.slug,
      sourceCredit: studentInfo.sourceCredit,
      sourceUrl: studentInfo.sourceUrl,
      summary: studentInfo.summary,
      title: studentInfo.title,
      updatedAt: now,
      ...(action === "save_draft" && current.publicationStatus !== "DRAFT"
        ? { publicationStatus: "DRAFT" as const }
        : {}),
      ...(action === "submit_review"
        ? { publicationStatus: "IN_REVIEW" as const }
        : {}),
      ...(action === "publish"
        ? {
            publicationStatus: "PUBLISHED" as const,
            publishedAt: now,
            publishedByUserId: actorUserId,
            reviewerUserId: actorUserId,
            scheduledAt: null,
          }
        : {}),
      ...(action === "archive"
        ? { archivedAt: now, publicationStatus: "ARCHIVED" as const }
        : {}),
    };
    const [updated] = await transaction
      .update(studentInfoPosts)
      .set(values)
      .where(
        and(
          eq(studentInfoPosts.id, id),
          eq(studentInfoPosts.updatedAt, expected),
        ),
      )
      .returning({ id: studentInfoPosts.id });
    if (!updated)
      throw new ContentServiceError(
        "CONFLICT",
        "Konten berubah sebelum disimpan.",
      );
    await transaction.insert(auditEvents).values({
      action: auditAction(action),
      actorType: "BEM_USER",
      actorUserId,
      metadata: {
        contentKind: kind,
        publicationStatus:
          values.publicationStatus ?? current.publicationStatus,
      },
      result: "SUCCESS",
      targetId: id,
      targetType: targetType(kind),
    });
    return (await getAdminContent(kind, id, transaction)) as AdminContentItem;
  });
}

export function articleReadTime(article: PublicArticle): string {
  return readingTime(article.body);
}
