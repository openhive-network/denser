import {
  createHiveChain,
  BroadcastTransactionRequest,
  IHiveChainInterface,
  ITransactionBuilder
} from '@hive/wax/web';
import { toast } from '@hive/ui/components/hooks/use-toast';
import { getSigner } from '@smart-signer/lib/signer/get-signer';
import { SignerOptions } from '@smart-signer/lib/signer/signer';
import { hiveChainService } from './hive-chain-service';

import { getLogger } from '@hive/ui/lib/logging';
const logger = getLogger('app');

class TransactionService {
  description = 'Transaction broadcast error';

  async processHiveAppOperation(cb: (opBuilder: ITransactionBuilder) => void, signerOptions: SignerOptions) {
    const txBuilder = await (await hiveChainService.getHiveChain()).getTransactionBuilder();

    cb(txBuilder);
    await this.processTransaction(txBuilder, signerOptions);
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
    try {
      await (await hiveChainService.getHiveChain()).api.network_broadcast_api.broadcast_transaction(broadcastReq);
    } catch (e) {
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
}

export const transactionService = new TransactionService();
