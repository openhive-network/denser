/**
 * Stores broadcasted transactions for test assertions.
 *
 * When the mock server intercepts a `network_broadcast_api.broadcast_transaction`
 * call, it captures the full transaction payload here so tests can inspect
 * what was broadcast without hitting the real blockchain.
 */
export interface IBroadcastedTransaction {
  /** Full transaction object as sent by the client */
  trx: Record<string, unknown>;
  /** Additional params sent alongside the transaction (e.g. max_block_age) */
  params: Record<string, unknown>;
  /** Timestamp when the transaction was captured */
  capturedAt: Date;
}

export class TransactionStore {
  private transactions: IBroadcastedTransaction[] = [];

  /** Record a broadcasted transaction */
  public capture(params: Record<string, unknown>): void {
    this.transactions.push({
      trx: (params.trx as Record<string, unknown>) ?? {},
      params,
      capturedAt: new Date()
    });
  }

  /** Get all captured transactions */
  public getAll(): IBroadcastedTransaction[] {
    return [...this.transactions];
  }

  /** Get the last captured transaction */
  public getLast(): IBroadcastedTransaction | undefined {
    return this.transactions[this.transactions.length - 1];
  }

  /** Get captured transaction count */
  public count(): number {
    return this.transactions.length;
  }

  /** Clear all captured transactions */
  public clear(): void {
    this.transactions = [];
  }
}
