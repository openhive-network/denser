import {
  CommunityOperationBuilder,
  FollowOperationBuilder,
  createHiveChain,
  BroadcastTransactionRequest,
  IHiveChainInterface,
  ITransactionBuilder,
  IHiveAppsOperation
} from '@hive/wax/web';
import { logger } from '@hive/ui/lib/logger';
import { toast } from '@hive/ui/components/hooks/use-toast';
import { getSigner } from '@smart-signer/lib/signer/get-signer';
import { SignerOptions } from '@smart-signer/lib/signer/signer';
import { KeyTypes } from '@smart-signer/types/common';

class TransactionService {
  description = 'Transaction broadcast error';
  static hiveChain: IHiveChainInterface;

  async getHiveChain(): Promise<IHiveChainInterface> {
    if (!TransactionService.hiveChain) {
      TransactionService.hiveChain = await createHiveChain({ apiEndpoint: 'https://api.hive.blog' });
    }

    return TransactionService.hiveChain;
  }

  async processHiveAppOperation(
    cb: (opBuilder: ITransactionBuilder) => void,
    signerOptions: SignerOptions
  ) {
    const txBuilder = await (await this.getHiveChain()).getTransactionBuilder();

    cb(txBuilder);
    await this.processTransaction(txBuilder, signerOptions);
  }

  async processTransaction(
    txBuilder: ITransactionBuilder,
    signerOptions: SignerOptions
  ): Promise<void> {
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
      await (await this.getHiveChain()).api.network_broadcast_api.broadcast_transaction(broadcastReq);
    } catch (e) {
      logger.error('got error', e);
      toast({
        description: e as String,
        variant: 'destructive'
      });
    }
  }
}

export const transactionService = new TransactionService();
