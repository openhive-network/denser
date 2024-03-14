import {
  BroadcastTransactionRequest,
  CommunityOperationBuilder,
  FollowOperationBuilder,
  ITransactionBuilder,
  WaxChainApiError,
  future_extensions
} from '@hive/wax';
import { toast } from '@hive/ui/components/hooks/use-toast';
import { getSigner } from '@smart-signer/lib/signer/get-signer';
import { SignerOptions } from '@smart-signer/lib/signer/signer';
import { hiveChainService } from './lib/hive-chain-service';
import { getLogger } from '@hive/ui/lib/logging';
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

  async upVote(author: string, permlink: string, signerOptions: SignerOptions, weight = 10000) {
    await this.processHiveAppOperation((builder) => {
      builder
        .push({
          vote: {
            voter: signerOptions.username,
            author,
            permlink,
            weight
          }
        })
        .build();
    }, signerOptions);
  }

  async downVote(author: string, permlink: string, signerOptions: SignerOptions, weight = -10000) {
    await this.processHiveAppOperation((builder) => {
      builder
        .push({
          vote: {
            voter: signerOptions.username,
            author,
            permlink,
            weight
          }
        })
        .build();
    }, signerOptions);
  }

  async subscribe(username: string, signerOptions: SignerOptions) {
    await this.processHiveAppOperation((builder) => {
      builder.push(
        new CommunityOperationBuilder().subscribe(username).authorize(signerOptions.username).build()
      );
    }, signerOptions);
  }

  async unsubscribe(username: string, signerOptions: SignerOptions) {
    await this.processHiveAppOperation((builder) => {
      builder.push(
        new CommunityOperationBuilder().unsubscribe(username).authorize(signerOptions.username).build()
      );
    }, signerOptions);
  }

  async flag(
    community: string,
    username: string,
    permlink: string,
    notes: string,
    signerOptions: SignerOptions
  ) {
    await this.processHiveAppOperation((builder) => {
      builder.push(
        new CommunityOperationBuilder()
          .flagPost(community, username, permlink, notes)
          .authorize(signerOptions.username)
          .build()
      );
    }, signerOptions);
  }

  async reblog(username: string, permlink: string, signerOptions: SignerOptions) {
    await this.processHiveAppOperation((builder) => {
      builder.push(
        new FollowOperationBuilder()
          .reblog(signerOptions.username, username, permlink)
          .authorize(signerOptions.username)
          .build()
      );
    }, signerOptions);
  }

  async follow(username: string, signerOptions: SignerOptions) {
    await this.processHiveAppOperation((builder) => {
      builder.push(
        new FollowOperationBuilder()
          .followBlog(signerOptions.username, username)
          .authorize(signerOptions.username)
          .build()
      );
    }, signerOptions);
  }

  async unfollow(username: string, signerOptions: SignerOptions) {
    await this.processHiveAppOperation((builder) => {
      builder.push(
        new FollowOperationBuilder()
          .unfollowBlog(signerOptions.username, username)
          .authorize(signerOptions.username)
          .build()
      );
    }, signerOptions);
  }

  async mute(username: string, signerOptions: SignerOptions) {
    await this.processHiveAppOperation((builder) => {
      builder.push(
        new FollowOperationBuilder()
          .muteBlog(signerOptions.username, username)
          .authorize(signerOptions.username)
          .build()
      );
    }, signerOptions);
  }

  async unmute(username: string, signerOptions: SignerOptions) {
    await this.processHiveAppOperation((builder) => {
      builder.push(
        new FollowOperationBuilder()
          .unmuteBlog(signerOptions.username, username)
          .authorize(signerOptions.username)
          .build()
      );
    }, signerOptions);
  }

  async comment(parentAuthor: string, parentPermlink: string, body: string, signerOptions: SignerOptions) {
    await this.processHiveAppOperation((builder) => {
      builder.pushReply(parentAuthor, parentPermlink, signerOptions.username, body).build();
    }, signerOptions);
  }

  async post(permlink: string, title: string, body: string, tags: string[], signerOptions: SignerOptions) {
    await this.processHiveAppOperation((builder) => {
      builder
        .pushArticle(signerOptions.username, permlink, title, body)
        .pushTags(tags[0], ...tags.slice(1))
        .build();
    }, signerOptions);
  }

  async updateProposalVotes(
    proposal_ids: string[],
    approve: boolean,
    extensions: future_extensions[],
    signerOptions: SignerOptions
  ) {
    await this.processHiveAppOperation((builder) => {
      builder
        .push({
          update_proposal_votes: {
            voter: signerOptions.username,
            proposal_ids,
            approve,
            extensions
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
