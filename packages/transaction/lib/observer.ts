// It is used to observe the transaction lifecycle.
import { AccountOperationVisitor } from './visitor';
import { hiveChainService } from './hive-chain-service';
import { ApiTransaction, ITransactionBuilder, transaction } from '@hiveio/wax';
import { TransactionQueue } from './queue';

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

    if (!this.visitor) {
      this.visitor = new AccountOperationVisitor(account);
    }

    this.running = true;

    const { head_block_number } = await (
      await hiveChainService.getHiveChain()
    ).api.database_api.get_dynamic_global_properties({});
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
      // Get the head block, but wait at least DEFAULT_BLOCK_INTERVAL_TIMEOUT ms
      const [{ block }] = await Promise.all([
        await (
          await hiveChainService.getHiveChain()
        ).api.block_api.get_block({ block_num: this.headBlockNumber }),
        new Promise((res) => {
          setTimeout(res, DEFAULT_BLOCK_INTERVAL_TIMEOUT);
        })
      ]);

      let found;

      if (typeof block === 'object') {
        for (let i = 0; i < block.transaction_ids.length; ++i) {
          const tx = block.transactions[i];

          const incomingTransaction = (await hiveChainService.getHiveChain()).TransactionBuilder.fromApi(tx);


          console.log(incomingTransaction.id, txBuilder.id);
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
          console.log('Should resolve!', found);
          return Promise.resolve();
        }
        
        ++this.headBlockNumber;
      }
    } catch (error) {
      console.log('Should error!');
      await new Promise((res) => {
        setTimeout(res, DEFAULT_BLOCK_INTERVAL_TIMEOUT);
      });
      return Promise.reject(error);
    } finally {
      if (this.running) {
        console.log('Should recurse!');
        await this.processTransactionQueue(txBuilder);
      }
    }
  }
}

const observer = new Observer();

export { observer };
