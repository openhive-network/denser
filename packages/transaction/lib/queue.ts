import { ITransactionBuilder, transaction } from '@hiveio/wax';

import { getLogger } from '@hive/ui/lib/logging';
const logger = getLogger('app');

export type Task = (...args: any[]) => Promise<void>;

export class TransactionQueue {
  private queue: (() => Promise<void>)[] = [];
  private isProcessing = false;

  public get processing() {
    return this.isProcessing;
  }

  public get hasMoreTasks() {
    return this.queue.length > 0;
  }

  public async enqueue(task: Task, txBuilder: ITransactionBuilder): Promise<any> {
    return new Promise(async (resolve, reject) => {
      const taskWithResolve = async () => {
        try {
          const response = await task(txBuilder);
          // TODO: Resolve value binding
          resolve(response);
        } catch (error) {
          logger.error('Error in enqueue: %o', error);
          reject(error);
        }
      }

      this.queue.push(taskWithResolve);

      await this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift();
      logger.info('queue: %o', this.queue);
      await task!();
    }

    this.isProcessing = false;
  }
}
