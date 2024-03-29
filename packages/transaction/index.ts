import {
  BroadcastTransactionRequest,
  CommunityOperationBuilder,
  EFollowBlogAction,
  FollowOperationBuilder,
  ITransactionBuilder,
  NaiAsset,
  WaxChainApiError,
  future_extensions
} from '@hive/wax';
import { toast } from '@hive/ui/components/hooks/use-toast';
import { getSigner } from '@smart-signer/lib/signer/get-signer';
import { SignerOptions } from '@smart-signer/lib/signer/signer';
import { hiveChainService } from './lib/hive-chain-service';
import { Beneficiarie } from './lib/app-types';
import { getLogger } from '@hive/ui/lib/logging';
const logger = getLogger('app');

class TransactionService {
  description = 'Transaction broadcast error';
  signerOptions!: SignerOptions;

  setSignerOptions(signerOptions: SignerOptions) {
    this.signerOptions = signerOptions;
  }

  async processHiveAppOperation(cb: (opBuilder: ITransactionBuilder) => void) {
    try {
      const txBuilder = await (await hiveChainService.getHiveChain()).getTransactionBuilder();
      cb(txBuilder);
      await this.processTransaction(txBuilder);
    } catch (error) {
      this.handleError(error);
    }
  }

  async processTransaction(txBuilder: ITransactionBuilder): Promise<void> {
    // validate
    txBuilder.validate();

    // Sign using smart-signer
    // pass to smart-signer txBuilder.sigDigest
    const signer = getSigner(this.signerOptions);

    const signature = await signer.signTransaction({
      digest: txBuilder.sigDigest,
      transaction: txBuilder.build() // builded transaction
    });

    txBuilder.build(signature);
    // create broadcast request
    const broadcastReq = new BroadcastTransactionRequest(txBuilder);

    // do broadcast
    try {
      await (
        await hiveChainService.getHiveChain()
      ).api.network_broadcast_api.broadcast_transaction(broadcastReq);
    } catch (error) {
      this.handleError(error);
    }
  }

  async upVote(author: string, permlink: string, weight = 10000) {
    await this.processHiveAppOperation((builder) => {
      builder
        .push({
          vote: {
            voter: this.signerOptions.username,
            author,
            permlink,
            weight
          }
        })
        .build();
    });
  }

  async downVote(author: string, permlink: string, weight = -10000) {
    await this.processHiveAppOperation((builder) => {
      builder
        .push({
          vote: {
            voter: this.signerOptions.username,
            author,
            permlink,
            weight
          }
        })
        .build();
    });
  }

  async subscribe(username: string) {
    await this.processHiveAppOperation((builder) => {
      builder.push(
        new CommunityOperationBuilder().subscribe(username).authorize(this.signerOptions.username).build()
      );
    });
  }

  async unsubscribe(username: string) {
    await this.processHiveAppOperation((builder) => {
      builder.push(
        new CommunityOperationBuilder().unsubscribe(username).authorize(this.signerOptions.username).build()
      );
    });
  }

  async flag(community: string, username: string, permlink: string, notes: string) {
    await this.processHiveAppOperation((builder) => {
      builder.push(
        new CommunityOperationBuilder()
          .flagPost(community, username, permlink, notes)
          .authorize(this.signerOptions.username)
          .build()
      );
    });
  }

  async reblog(username: string, permlink: string) {
    await this.processHiveAppOperation((builder) => {
      builder.push(
        new FollowOperationBuilder()
          .reblog(this.signerOptions.username, username, permlink)
          .authorize(this.signerOptions.username)
          .build()
      );
    });
  }

  async follow(username: string) {
    await this.processHiveAppOperation((builder) => {
      builder.push(
        new FollowOperationBuilder()
          .followBlog(this.signerOptions.username, username)
          .authorize(this.signerOptions.username)
          .build()
      );
    });
  }

  async unfollow(username: string) {
    await this.processHiveAppOperation((builder) => {
      builder.push(
        new FollowOperationBuilder()
          .unfollowBlog(this.signerOptions.username, username)
          .authorize(this.signerOptions.username)
          .build()
      );
    });
  }

  async mute(otherBlogs: string, blog = '') {
    await this.processHiveAppOperation((builder) => {
      builder.push(
        new FollowOperationBuilder()
          .muteBlog(this.signerOptions.username, blog, ...otherBlogs.split(', '))
          .authorize(this.signerOptions.username)
          .build()
      );
    });
  }

  async unmute(blog: string) {
    await this.processHiveAppOperation((builder) => {
      builder.push(
        new FollowOperationBuilder()
          .unmuteBlog(this.signerOptions.username, blog)
          .authorize(this.signerOptions.username)
          .build()
      );
    });
  }

  async resetBlogList() {
    await this.processHiveAppOperation((builder) => {
      builder.push(
        new FollowOperationBuilder()
          .resetBlogList(EFollowBlogAction.MUTE_BLOG, this.signerOptions.username, 'all')
          .authorize(this.signerOptions.username)
          .build()
      );
    });
  }

  async blacklistBlog(otherBlogs: string, blog = '') {
    await this.processHiveAppOperation((builder) => {
      builder.push(
        new FollowOperationBuilder()
          .blacklistBlog(this.signerOptions.username, blog, ...otherBlogs.split(', '))
          .authorize(this.signerOptions.username)
          .build()
      );
    });
  }

  async unblacklistBlog(blog: string) {
    await this.processHiveAppOperation((builder) => {
      builder.push(
        new FollowOperationBuilder()
          .unblacklistBlog(this.signerOptions.username, blog)
          .authorize(this.signerOptions.username)
          .build()
      );
    });
  }

  async followBlacklistBlog(otherBlogs: string, blog = '') {
    await this.processHiveAppOperation((builder) => {
      builder.push(
        new FollowOperationBuilder()
          .followBlacklistBlog(this.signerOptions.username, blog, ...otherBlogs.split(', '))
          .authorize(this.signerOptions.username)
          .build()
      );
    });
  }

  async unfollowBlacklistBlog(blog: string) {
    await this.processHiveAppOperation((builder) => {
      builder.push(
        new FollowOperationBuilder()
          .unfollowBlacklistBlog(this.signerOptions.username, blog)
          .authorize(this.signerOptions.username)
          .build()
      );
    });
  }

  async followMutedBlog(otherBlogs: string, blog = '') {
    await this.processHiveAppOperation((builder) => {
      builder.push(
        new FollowOperationBuilder()
          .followMutedBlog(this.signerOptions.username, blog, ...otherBlogs.split(', '))
          .authorize(this.signerOptions.username)
          .build()
      );
    });
  }

  async resetAllBlog() {
    await this.processHiveAppOperation((builder) => {
      builder.push(
        new FollowOperationBuilder()
          .resetAllBlog(this.signerOptions.username, 'all')
          .authorize(this.signerOptions.username)
          .build()
      );
    });
  }

  async resetBlacklistBlog() {
    await this.processHiveAppOperation((builder) => {
      builder.push(
        new FollowOperationBuilder()
          .resetBlacklistBlog(this.signerOptions.username, 'all')
          .authorize(this.signerOptions.username)
          .build()
      );
    });
  }

  async resetFollowBlacklistBlog() {
    await this.processHiveAppOperation((builder) => {
      builder.push(
        new FollowOperationBuilder()
          .resetFollowBlacklistBlog(this.signerOptions.username, 'all')
          .authorize(this.signerOptions.username)
          .build()
      );
    });
  }

  async resetFollowMutedBlog() {
    await this.processHiveAppOperation((builder) => {
      builder.push(
        new FollowOperationBuilder()
          .resetFollowMutedBlog(this.signerOptions.username, 'all')
          .authorize(this.signerOptions.username)
          .build()
      );
    });
  }

  async unfollowMutedBlog(blog: string) {
    await this.processHiveAppOperation((builder) => {
      builder.push(
        new FollowOperationBuilder()
          .unfollowMutedBlog(this.signerOptions.username, blog)
          .authorize(this.signerOptions.username)
          .build()
      );
    });
  }

  async comment(parentAuthor: string, parentPermlink: string, body: string) {
    await this.processHiveAppOperation((builder) => {
      builder.pushReply(parentAuthor, parentPermlink, this.signerOptions.username, body).build();
    });
  }

  async post(
    permlink: string,
    title: string,
    body: string,
    beneficiaries: Beneficiarie[],
    percentHbd: number,
    maxAcceptedPayout: NaiAsset,
    tags: string[],
    category: string
  ) {
    await this.processHiveAppOperation((builder) => {
      const op = builder
        .pushArticle(this.signerOptions.username, permlink, title, body)
        .setCategory(category !== 'blog' ? category : tags[0])
        .setPercentHbd(percentHbd)
        .setMaxAcceptedPayout(maxAcceptedPayout)
        .pushTags(tags[0], ...tags.slice(1));

      beneficiaries.forEach((beneficiarie) => {
        op.addBeneficiary(beneficiarie.account, Number(beneficiarie.weight));
      });

      op.build();

      builder.build();
    });
  }

  async updateProposalVotes(proposal_ids: string[], approve: boolean, extensions: future_extensions[]) {
    await this.processHiveAppOperation((builder) => {
      builder
        .push({
          update_proposal_votes: {
            voter: this.signerOptions.username,
            proposal_ids,
            approve,
            extensions
          }
        })
        .build();
    });
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
