import {
  createHiveChain,
  BroadcastTransactionRequest,
  IHiveChainInterface,
  ITransactionBuilder
} from '@hive/wax/web';
import { toast } from '@hive/ui/components/hooks/use-toast';
import { getSigner } from '@smart-signer/lib/signer/get-signer';
import { SignerOptions } from '@smart-signer/lib/signer/signer';

import { getLogger } from '@hive/ui/lib/logging';
const logger = getLogger('app');

class TransactionService {
  description = 'Transaction broadcast error';
  static hiveChain: IHiveChainInterface;

  async getHiveChain(): Promise<IHiveChainInterface> {
    if (!TransactionService.hiveChain) {
      TransactionService.hiveChain = await createHiveChain({ apiEndpoint: 'https://api.hive.blog' });
    }

    return TransactionService.hiveChain;
  }

  async processHiveAppOperation(cb: (opBuilder: ITransactionBuilder) => void, signerOptions: SignerOptions) {
    try {
      const txBuilder = await (await this.getHiveChain()).getTransactionBuilder();
      cb(txBuilder);
      await this.processTransaction(txBuilder, signerOptions);
    } catch (error) {
      this.handleError(error);
    }
  }

  async processTransaction(txBuilder: ITransactionBuilder, signerOptions: SignerOptions): Promise<void> {
    // validate
    txBuilder.validate();

    // Sign using smart-signer
    // pass to smart-signer txBuilder.sigDigest
    const signer = getSigner(signerOptions);

    const signature = await signer.signTransaction({
      digest: txBuilder.sigDigest,
      transaction: txBuilder.build() // builded transaction
    });

    txBuilder.build(signature);
    // create broadcast request
    const broadcastReq = new BroadcastTransactionRequest(txBuilder);

    // do broadcast
    await (await this.getHiveChain()).api.network_broadcast_api.broadcast_transaction(broadcastReq);
  }

  handleError (e: any) {
    logger.error('got error', e);
    const isError = (err: unknown): err is Error => err instanceof Error;
    let description = 'Unknown error';
    if (isError(e)) {
      description = e.message;
    } else if (typeof e === 'string') {
      description = e;
    }
    toast({
      description,
      variant: 'destructive'
    });
  }

}

export const transactionService = new TransactionService();
