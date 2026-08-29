import { asc, eq } from "drizzle-orm";

import { type Database, getDatabase } from "@/server/db/client";
import { categories } from "@/server/db/schema";

export function createCategoryRepository(database: Database = getDatabase()) {
  return {
    listActive() {
      return database
        .select({
          description: categories.description,
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
        })
        .from(categories)
        .where(eq(categories.isActive, true))
        .orderBy(asc(categories.sortOrder), asc(categories.name));
    },
  };
}
