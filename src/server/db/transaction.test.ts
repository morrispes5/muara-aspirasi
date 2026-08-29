import { describe, expect, it, vi } from "vitest";

import { withDatabaseTransaction } from "@/server/db/transaction";

describe("withDatabaseTransaction", () => {
  it("menjalankan seluruh pekerjaan melalui satu batas transaksi", async () => {
    const transaction = vi.fn();
    const database = {
      transaction: async <TResult>(
        work: (tx: { id: string }) => Promise<TResult>,
      ) => {
        transaction();
        return work({ id: "transaction-1" });
      },
    };
    const work = vi.fn(async (database: { id: string }) => database.id);

    await expect(withDatabaseTransaction(database, work)).resolves.toBe(
      "transaction-1",
    );

    expect(transaction).toHaveBeenCalledOnce();
    expect(work).toHaveBeenCalledWith({ id: "transaction-1" });
  });

  it("meneruskan kegagalan agar perubahan database dapat di-rollback", async () => {
    const transaction = vi.fn();
    const database = {
      transaction: async <TResult>(
        work: (tx: undefined) => Promise<TResult>,
      ) => {
        transaction();
        return work(undefined);
      },
    };
    const failure = new Error("rollback expected");

    await expect(
      withDatabaseTransaction(database, async () => {
        throw failure;
      }),
    ).rejects.toBe(failure);
  });
});
