import { and, desc, eq, ilike, isNull, or, type SQL } from "drizzle-orm";
import {
  aspirationReports,
  reportAssignments,
  reporterIdentities,
} from "@/server/db/schema";
import type { Database } from "@/server/db/client";
import type { ReportStatus } from "@/server/aspirations/case-management";

export type IdentitySuggestion = {
  id: string;
  name: string;
  nim: string;
  title: string;
  status: ReportStatus;
  archived: boolean;
  matchedBy: "name" | "nim";
};
export type IdentitySuggestions = {
  items: IdentitySuggestion[];
  totalMatches: number;
  truncated: boolean;
};

// A bounded fallback on the server, across the filtered dataset (not the current page).
const candidateLimit = 1000;
const displayLimit = 10;
function words(value: string) {
  return (
    value
      .toLowerCase()
      .normalize("NFKC")
      .match(/[\p{L}\p{N}]+/gu) ?? []
  );
}

// Damerau-Levenshtein also handles a deletion adjacent to a transposed pair.
export function identityDistance(a: string, b: string) {
  const ceiling = a.length + b.length;
  const matrix = Array.from({ length: a.length + 2 }, () =>
    Array<number>(b.length + 2).fill(0),
  );
  const lastRow = new Map<string, number>();
  matrix[0][0] = ceiling;
  for (let i = 0; i <= a.length; i++) {
    matrix[i + 1][0] = ceiling;
    matrix[i + 1][1] = i;
  }
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j + 1] = ceiling;
    matrix[1][j + 1] = j;
  }
  for (let i = 1; i <= a.length; i++) {
    let lastColumn = 0;
    for (let j = 1; j <= b.length; j++) {
      const priorRow = lastRow.get(b[j - 1]) ?? 0;
      const priorColumn = lastColumn;
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      if (!cost) lastColumn = j;
      matrix[i + 1][j + 1] = Math.min(
        matrix[i][j] + cost,
        matrix[i + 1][j] + 1,
        matrix[i][j + 1] + 1,
        matrix[priorRow][priorColumn] +
          (i - priorRow - 1) +
          1 +
          (j - priorColumn - 1),
      );
    }
    lastRow.set(a[i - 1], i);
  }
  return matrix[a.length + 1][b.length + 1];
}

function searchKind(search: string) {
  if (/^\d{7,20}$/.test(search)) return "nim";
  if (
    /^[\p{L}\s'-]+$/u.test(search) &&
    words(search).some((word) => word.length >= 4)
  )
    return "name";
  return null;
}

export function rankIdentitySuggestions(
  search: string,
  candidates: Omit<IdentitySuggestion, "matchedBy">[],
) {
  const kind = searchKind(search);
  if (!kind) return [];
  return candidates
    .flatMap<{ item: IdentitySuggestion; score: number }>((item) => {
      if (kind === "nim") {
        if (
          !/^\d+$/.test(item.nim) ||
          Math.abs(search.length - item.nim.length) > 1
        )
          return [];
        const distance = identityDistance(search, item.nim);
        // Missing/extra digits are more useful to investigate than a neighboring valid NIM.
        return distance <= 1
          ? [
              {
                item: { ...item, matchedBy: kind },
                score:
                  distance * 10 + (item.nim.length === search.length ? 1 : 0),
              },
            ]
          : [];
      }
      const stored = words(item.name);
      let score = 0;
      for (const word of words(search)) {
        const threshold = word.length >= 7 ? 2 : word.length >= 4 ? 1 : 0;
        const distance = Math.min(
          ...stored.map((part) =>
            part.includes(word) ? 0 : identityDistance(word, part),
          ),
        );
        if (distance > threshold) return [];
        score += distance;
      }
      return [{ item: { ...item, matchedBy: kind }, score }];
    })
    .sort((a, b) => a.score - b.score)
    .map((result) => result.item);
}

function candidateFilter(search: string, kind: "name" | "nim") {
  if (kind === "nim") {
    // Parameterized LIKE patterns cover one missing/extra/replaced/swapped digit.
    const patterns = new Set([search]);
    for (let i = 0; i <= search.length; i++) {
      patterns.add(search.slice(0, i) + "_" + search.slice(i));
      if (i < search.length) {
        patterns.add(search.slice(0, i) + search.slice(i + 1));
        patterns.add(search.slice(0, i) + "_" + search.slice(i + 1));
      }
      if (i < search.length - 1)
        patterns.add(
          search.slice(0, i) + search[i + 1] + search[i] + search.slice(i + 2),
        );
    }
    return or(
      ...[...patterns].map((pattern) => ilike(reporterIdentities.nim, pattern)),
    );
  }
  // Any unchanged two-character seed narrows candidates; the distance check decides matches.
  const seeds = new Set(
    words(search)
      .filter((word) => word.length >= 4)
      .flatMap((word) =>
        Array.from({ length: word.length - 1 }, (_, i) => word.slice(i, i + 2)),
      ),
  );
  return or(
    ...[...seeds].map((seed) => ilike(reporterIdentities.name, `%${seed}%`)),
  );
}

export async function findIdentitySuggestions(
  search: string,
  filters: SQL | undefined,
  database: Database,
): Promise<IdentitySuggestions> {
  const kind = searchKind(search);
  if (!kind) return { items: [], totalMatches: 0, truncated: false };
  const rows = await database
    .select({
      id: aspirationReports.id,
      name: reporterIdentities.name,
      nim: reporterIdentities.nim,
      title: aspirationReports.title,
      status: aspirationReports.status,
      archivedAt: aspirationReports.archivedAt,
    })
    .from(aspirationReports)
    .innerJoin(
      reporterIdentities,
      eq(reporterIdentities.reportId, aspirationReports.id),
    )
    .leftJoin(
      reportAssignments,
      and(
        eq(reportAssignments.reportId, aspirationReports.id),
        isNull(reportAssignments.endedAt),
      ),
    )
    .where(and(filters, candidateFilter(search, kind)))
    .orderBy(desc(aspirationReports.submittedAt), desc(aspirationReports.id))
    .limit(candidateLimit + 1);
  const ranked = rankIdentitySuggestions(
    search,
    rows.slice(0, candidateLimit).map((row) => ({
      id: row.id,
      name: row.name,
      nim: row.nim,
      title: row.title,
      status: row.status,
      archived: Boolean(row.archivedAt),
    })),
  );
  return {
    items: ranked.slice(0, displayLimit),
    totalMatches: ranked.length,
    truncated: rows.length > candidateLimit,
  };
}
