// It is used to observe the transaction lifecycle.
import { AccountOperationVisitor } from './visitor';
import { hiveChainService } from './hive-chain-service';
import { ApiTransaction, ITransactionBuilder, transaction } from '@hiveio/wax';
import { TransactionQueue } from './queue';

import { getLogger } from '@hive/ui/lib/logging';
const logger = getLogger('app');

export const DEFAULT_BLOCK_INTERVAL_TIMEOUT = 1500;

export interface TransactionData {
  id: string;
  transaction: ApiTransaction;
}

export type Task<T> = (txPromise: (transaction: transaction) => Promise<T>) => Promise<void>;

class Observer {
  private queue: TransactionQueue = new TransactionQueue();
  private headBlockNumber: number = 0;
  private running = false;
  private visitor!: AccountOperationVisitor;

  public async start(account: string): Promise<void> {
    if (this.running) return;

    this.running = true;

    // TODO So we need to clear this.visitor stop any pending tasks on
    // each logout.
    if (!this.visitor) {
      this.visitor = new AccountOperationVisitor(account);
    }

    const { head_block_number } = await (
      await hiveChainService.getHiveChain()
    ).api.database_api.get_dynamic_global_properties({});
    logger.info('Observer setting this.headBlockNumber to: %s', head_block_number);
    this.headBlockNumber = head_block_number;
  }

  public stop(): void {
    this.running = false;
  }

  // TODO: update task return to transaction status
  public async observe(txBuilder: ITransactionBuilder): Promise<any> {
    return await this.queue.enqueue.call(this.queue, this.processTransactionQueue.bind(this), txBuilder);
  }

  private async processTransactionQueue(txBuilder: ITransactionBuilder): Promise<any> {
    try {
      logger.info('Processing block no: %s', this.headBlockNumber);
      // Get the head block, but wait at least DEFAULT_BLOCK_INTERVAL_TIMEOUT ms
      const [{ block }] = await Promise.all([
        await (
          await hiveChainService.getHiveChain()
        ).api.block_api.get_block({ block_num: this.headBlockNumber }),
        new Promise((res) => {
          setTimeout(res, DEFAULT_BLOCK_INTERVAL_TIMEOUT);
        })
      ]);

      logger.info('Looking for transaction id: %s', txBuilder.id);

      let found;
      if (typeof block === 'object') {
        for (let i = 0; i < block.transaction_ids.length; ++i) {
          const tx = block.transactions[i];
          const incomingTransaction = (await hiveChainService.getHiveChain()).TransactionBuilder.fromApi(tx);

          // logger.info('%s %s', incomingTransaction.id, txBuilder.id);
          if (incomingTransaction.id !== txBuilder.id) continue;

          for (const op of incomingTransaction.build().operations) {
            const result = this.visitor.accept(op);
             // TODO: Check if transaction id is the same as requested.

            if (typeof result === 'object') {
              found = result;

              if (!this.queue.hasMoreTasks) {
                this.stop();
              }
              break;
            }
          }
        }

        if (found) {
          logger.info('Should resolve! found: %o', found);
          return Promise.resolve(found);
        }

        ++this.headBlockNumber;
      }
    } catch (error) {
      logger.info('Should error! error: %o', error);
      await new Promise((res) => {
        setTimeout(res, DEFAULT_BLOCK_INTERVAL_TIMEOUT);
      });
      return Promise.reject(error);
    } finally {
      if (this.running) {
        logger.info('Should recurse!');
        await this.processTransactionQueue(txBuilder);
      }
    }
  }
}

const observer = new Observer();

export { observer };
