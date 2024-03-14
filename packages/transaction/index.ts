import {
  BroadcastTransactionRequest,
  CommunityOperationBuilder,
  FollowOperationBuilder,
  ITransactionBuilder,
  WaxChainApiError,
  comment,
  vote,
  update_proposal_votes
} from '@hive/wax';
import { toast } from '@hive/ui/components/hooks/use-toast';
import { getSigner } from '@smart-signer/lib/signer/get-signer';
import { SignerOptions } from '@smart-signer/lib/signer/signer';
import { hiveChainService } from './lib/hive-chain-service';
import { getLogger } from '@hive/ui/lib/logging';
import { FlagData } from './lib/types';
import { User } from '@smart-signer/types/common';
const logger = getLogger('app');

class TransactionService {
  description = 'Transaction broadcast error';

  async processHiveAppOperation(cb: (opBuilder: ITransactionBuilder) => void, signerOptions: SignerOptions) {
    try {
      const txBuilder = await (await hiveChainService.getHiveChain()).getTransactionBuilder();
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
    await (
      await hiveChainService.getHiveChain()
    ).api.network_broadcast_api.broadcast_transaction(broadcastReq);
  }

  async vote(vote: vote, signerOptions: SignerOptions) {
    await transactionService.processHiveAppOperation((builder) => {
      builder.push({ vote }).build();
    }, signerOptions);
  }

  async subscribe(username: string, user: User, signerOptions: SignerOptions) {
    await transactionService.processHiveAppOperation((builder) => {
      builder.push(new CommunityOperationBuilder().subscribe(username).authorize(user.username).build());
    }, signerOptions);
  }

  async unsubscribe(username: string, user: User, signerOptions: SignerOptions) {
    await transactionService.processHiveAppOperation((builder) => {
      builder.push(new CommunityOperationBuilder().unsubscribe(username).authorize(user.username).build());
    }, signerOptions);
  }

  async flag(flagData: FlagData, user: User, signerOptions: SignerOptions) {
    await transactionService.processHiveAppOperation((builder) => {
      builder.push(
        new CommunityOperationBuilder()
          .flagPost(flagData.community, flagData.username, flagData.permlink, flagData.notes)
          .authorize(user.username)
          .build()
      );
    }, signerOptions);
  }

  async reblog(username: string, permlink: string, user: User, signerOptions: SignerOptions) {
    await transactionService.processHiveAppOperation((builder) => {
      builder.push(
        new FollowOperationBuilder()
          .reblog(user.username, username, permlink)
          .authorize(user.username)
          .build()
      );
    }, signerOptions);
  }

  async follow(username: string, user: User, signerOptions: SignerOptions) {
    await transactionService.processHiveAppOperation((builder) => {
      builder.push(
        new FollowOperationBuilder().followBlog(user.username, username).authorize(user.username).build()
      );
    }, signerOptions);
  }

  async unfollow(username: string, user: User, signerOptions: SignerOptions) {
    await transactionService.processHiveAppOperation((builder) => {
      builder.push(
        new FollowOperationBuilder().unfollowBlog(user.username, username).authorize(user.username).build()
      );
    }, signerOptions);
  }

  async mute(username: string, user: User, signerOptions: SignerOptions) {
    await transactionService.processHiveAppOperation((builder) => {
      builder.push(
        new FollowOperationBuilder().muteBlog(user.username, username).authorize(user.username).build()
      );
    }, signerOptions);
  }

  async unmute(username: string, user: User, signerOptions: SignerOptions) {
    await transactionService.processHiveAppOperation((builder) => {
      builder.push(
        new FollowOperationBuilder().unmuteBlog(user.username, username).authorize(user.username).build()
      );
    }, signerOptions);
  }

  async comment(comment: comment, signerOptions: SignerOptions) {
    await transactionService.processHiveAppOperation((builder) => {
      builder.push({ comment }).build();
    }, signerOptions);
  }

  async updateProposalVotes(proposalData: update_proposal_votes, signerOptions: SignerOptions) {
    await transactionService.processHiveAppOperation((builder) => {
      builder
        .push({
          update_proposal_votes: {
            voter: proposalData.voter,
            proposal_ids: proposalData.proposal_ids,
            approve: proposalData.approve,
            extensions: proposalData.extensions
          }
        })
        .build();
    }, signerOptions);
  }

  handleError(e: any) {
    logger.error('got error', e);
    const isError = (err: unknown): err is Error => err instanceof Error;
    const isWaxError = (err: unknown): err is WaxChainApiError => err instanceof WaxChainApiError;
    let description = 'Unknown error';
    if (isWaxError(e)) {
      const error = e as any;
      // this is temporary solution for "wait 5 minut after create another post" error
      if (error?.apiError?.code === -32003) {
        description = error?.apiError?.data?.stack[0]?.format;
      } else {
        description = error?.message ?? 'Unknown error';
      }
    } else if (isError(e)) {
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
