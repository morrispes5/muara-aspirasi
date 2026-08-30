import {
  boolean,
  check,
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { bemUserRoleEnum, bemUserStatusEnum } from "@/server/db/schema/enums";

export const bemUsers = pgTable(
  "bem_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: varchar("image", { length: 2048 }),
    role: bemUserRoleEnum("role").default("EDITOR").notNull(),
    status: bemUserStatusEnum("status").default("ACTIVE").notNull(),
    createdByUserId: uuid("created_by_user_id"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      "bem_users_email_normalized",
      sql`${table.email} = lower(${table.email})`,
    ),
    uniqueIndex("bem_users_email_unique").on(sql`lower(${table.email})`),
    index("bem_users_role_status_idx").on(table.role, table.status),
  ],
);
