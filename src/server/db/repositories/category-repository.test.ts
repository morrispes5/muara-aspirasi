import { describe, expect, it, vi } from "vitest";

import { createCategoryRepository } from "@/server/db/repositories";
import { type Database } from "@/server/db/client";

describe("createCategoryRepository", () => {
  it("hanya meminta kategori aktif dengan urutan yang stabil", async () => {
    const rows = [
      {
        description: "Akses dan kondisi fasilitas kampus.",
        id: "category-1",
        name: "Fasilitas kampus",
        slug: "fasilitas-kampus",
      },
    ];
    const orderBy = vi.fn().mockResolvedValue(rows);
    const where = vi.fn(() => ({ orderBy }));
    const from = vi.fn(() => ({ where }));
    const select = vi.fn(() => ({ from }));
    const database = { select } as unknown as Database;

    await expect(
      createCategoryRepository(database).listActive(),
    ).resolves.toEqual(rows);

    expect(select).toHaveBeenCalledOnce();
    expect(from).toHaveBeenCalledOnce();
    expect(where).toHaveBeenCalledOnce();
    expect(orderBy).toHaveBeenCalledOnce();
  });
});
