export interface TransactionRunner<TTransaction> {
  transaction<TResult>(
    work: (transaction: TTransaction) => Promise<TResult>,
  ): Promise<TResult>;
}

/**
 * Centralizes multi-record writes so a report, its identity, timeline, and audit
 * entries can be committed atomically in Milestone 5 without duplicating the
 * transaction boundary.
 */
export async function withDatabaseTransaction<TTransaction, TResult>(
  database: TransactionRunner<TTransaction>,
  work: (transaction: TTransaction) => Promise<TResult>,
): Promise<TResult> {
  return database.transaction(work);
}
