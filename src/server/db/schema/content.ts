import {
  boolean,
  index,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import {
  advocacyPublicationStatusEnum,
  studentInfoCategoryEnum,
  studentInfoPublicationStatusEnum,
} from "@/server/db/schema/enums";
import { aspirationReports } from "@/server/db/schema/aspirations";
import { bemUsers } from "@/server/db/schema/users";
import { categories } from "@/server/db/schema/categories";

export const advocacyUpdates = pgTable(
  "advocacy_updates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 120 }).notNull().unique(),
    title: varchar("title", { length: 200 }).notNull(),
    summary: varchar("summary", { length: 1000 }).notNull(),
    body: varchar("body", { length: 12000 }).notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    progressLabel: varchar("progress_label", { length: 120 }).notNull(),
    publicationStatus: advocacyPublicationStatusEnum("publication_status")
      .default("DRAFT")
      .notNull(),
    coverMediaKey: varchar("cover_media_key", { length: 512 }),
    coverAlt: varchar("cover_alt", { length: 500 }),
    sourceCredit: varchar("source_credit", { length: 500 }),
    authorUserId: uuid("author_user_id")
      .notNull()
      .references(() => bemUsers.id, { onDelete: "restrict" }),
    reviewerUserId: uuid("reviewer_user_id").references(() => bemUsers.id, {
      onDelete: "restrict",
    }),
    publishedByUserId: uuid("published_by_user_id").references(
      () => bemUsers.id,
      {
        onDelete: "restrict",
      },
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [
    index("advocacy_updates_publication_published_at_idx").on(
      table.publicationStatus,
      table.publishedAt,
    ),
    index("advocacy_updates_category_status_idx").on(
      table.categoryId,
      table.publicationStatus,
    ),
  ],
);

export const advocacyUpdateReports = pgTable(
  "advocacy_update_reports",
  {
    advocacyUpdateId: uuid("advocacy_update_id")
      .notNull()
      .references(() => advocacyUpdates.id, { onDelete: "restrict" }),
    reportId: uuid("report_id")
      .notNull()
      .references(() => aspirationReports.id, { onDelete: "restrict" }),
    linkedByUserId: uuid("linked_by_user_id")
      .notNull()
      .references(() => bemUsers.id, { onDelete: "restrict" }),
    linkedAt: timestamp("linked_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.advocacyUpdateId, table.reportId],
      name: "advocacy_update_reports_pk",
    }),
    index("advocacy_update_reports_report_id_idx").on(table.reportId),
  ],
);

export const studentInfoPosts = pgTable(
  "student_info_posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 120 }).notNull().unique(),
    title: varchar("title", { length: 200 }).notNull(),
    summary: varchar("summary", { length: 1000 }).notNull(),
    body: varchar("body", { length: 12000 }).notNull(),
    category: studentInfoCategoryEnum("category").notNull(),
    publicationStatus: studentInfoPublicationStatusEnum("publication_status")
      .default("DRAFT")
      .notNull(),
    isPinned: boolean("is_pinned").default(false).notNull(),
    coverMediaKey: varchar("cover_media_key", { length: 512 }),
    coverAlt: varchar("cover_alt", { length: 500 }),
    sourceUrl: varchar("source_url", { length: 2048 }),
    sourceCredit: varchar("source_credit", { length: 500 }),
    authorUserId: uuid("author_user_id")
      .notNull()
      .references(() => bemUsers.id, { onDelete: "restrict" }),
    reviewerUserId: uuid("reviewer_user_id").references(() => bemUsers.id, {
      onDelete: "restrict",
    }),
    publishedByUserId: uuid("published_by_user_id").references(
      () => bemUsers.id,
      {
        onDelete: "restrict",
      },
    ),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("student_info_posts_publication_published_at_idx").on(
      table.publicationStatus,
      table.publishedAt,
    ),
    index("student_info_posts_category_pinned_idx").on(
      table.category,
      table.isPinned,
    ),
  ],
);
