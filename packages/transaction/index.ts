import {
  CommunityOperationBuilder,
  EFollowBlogAction,
  FollowOperationBuilder,
  operation,
  createHiveChain,
  BroadcastTransactionRequest,
  IHiveChainInterface,
  ITransactionBuilder,
  IHiveAppsOperation
} from '@hive/wax/web';
import { logger } from '@hive/ui/lib/logger';
import { toast } from '@hive/ui/components/hooks/use-toast';
import { comment } from '@hive/wax/web';
import { createPermlink } from './lib/utils';
import { Entry } from '@ui/lib/bridge';
import { Signer, vote } from '@smart-signer/lib/signer';
import { User } from '@smart-signer/types/common';

// TODO Check errors message for indexOf for particular method

class TransactionService {
  static signer = new Signer();
  description = 'Transaction broadcast error';
  static hiveChain: IHiveChainInterface;

  async getHiveChain(): Promise<IHiveChainInterface> {
    if (!TransactionService.hiveChain) {
      TransactionService.hiveChain = await createHiveChain({ apiEndpoint: 'https://api.hive.blog' });
    }

    return TransactionService.hiveChain;
  }

  async followTransaction(cb: (builder: FollowOperationBuilder) => void): Promise<void> {
    // specific builder for ops
    const builder = new FollowOperationBuilder();

    // wait until callback
    cb(builder);

    await this.processTransaction(builder.build());
  }

  async communityTransaction(cb: (builder: CommunityOperationBuilder) => void): Promise<void> {
    // specific builder for ops
    const builder = new CommunityOperationBuilder();

    // wait until callback
    cb(builder);

    await this.processTransaction(builder.build());
  }

  async regularTransaction(cb: (builder: ITransactionBuilder) => void): Promise<void> {
    // specific builder for ops
    const txBuilder = await (await this.getHiveChain()).getTransactionBuilder();

    // wait until callback
    cb(txBuilder);

    await this.processTransaction(txBuilder.build().operations);
  }

  async processTransaction(ops: IHiveAppsOperation): Promise<void> {
    // main tx builder
    const txBuilder = await (await this.getHiveChain()).getTransactionBuilder();

    // push all specific ops to main tx builder
    txBuilder.push(ops);

    // validate
    txBuilder.validate();

    // Sign using smart-signer
    // pass to smart-signer txBuilder.sigDigest
    const signedTx = TransactionService.signer.signTransaction(txBuilder);

    // create broadcast request
    const broadcastReq = new BroadcastTransactionRequest(signedTx);

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
