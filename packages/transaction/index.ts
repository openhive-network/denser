import {
  ApiAccount,
  BlogPostOperation,
  BroadcastTransactionRequest,
  CommunityOperation,
  EFollowBlogAction,
  FollowOperation,
  type IArticle,
  type IReplyData,
  ITransaction,
  NaiAsset,
  ReplyOperation,
  asset,
  authority,
  future_extensions
} from '@hiveio/wax';
import { getSigner } from '@smart-signer/lib/signer/get-signer';
import { SignerOptions } from '@smart-signer/lib/signer/signer';
import { hiveChainService } from './lib/hive-chain-service';
import { Beneficiarie, Preferences } from './lib/app-types';
import WorkerBee, { ITransactionData, IWorkerBee } from '@hiveio/workerbee';

import { getLogger } from '@hive/ui/lib/logging';
const logger = getLogger('app');

export type TransactionErrorCallback = (error: any) => any;

export type TransactionBroadcastCallback = (
  txBuilder: ITransaction
) => Promise<TransactionBroadcastResult>;

export interface TransactionOptions {
  observe?: boolean;
}

export interface TransactionBroadcastResult {
  blockNumber?: number;
  transactionId: string;
}

export class TransactionService {
  /**
   * Options for Signer.
   *
   * @type {SignerOptions}
   * @memberof TransactionService
   */
  signerOptions!: SignerOptions;

  /**
   * The number of transactions observed.
   *
   * @memberof TransactionService
   */
  observedTransactionsCounter = 0;

  // WorkerBee instance for scanning Hive blockchain blocks.

  /**
   * Instance of WorkerBee Block Scanner.
   *
   * @type {(IWorkerBee | undefined)}
   * @memberof TransactionService
   */
  bot!: IWorkerBee | undefined;

  setSignerOptions(signerOptions: SignerOptions) {
    this.signerOptions = signerOptions;
  }

  /**
   * Create transaction and add operation to it (by running callback
   * `cb`), sign transaction, broadcast transaction and observe if
   * transaction has been applied in blockchain (if caller wants this).
   * The method runs `TransactionService.broadcastTransaction` and this
   * method does not observe if transaction has been applied in
   * blockchain – resolves just after sending transaction to API server.
   * When you want to observe transaction and resolve after applying it
   * in blockchain, pass `options.observe` set to true. Then method
   * `TransactionService.broadcastAndObserveTransaction` will be run and
   * this resolves after applying transaction in blockchain.
   *
   * @param {(opBuilder: ITransaction) => void} cb
   * @param {TransactionOptions} [transactionOptions={}]
   * @return {*}  {Promise<TransactionBroadcastResult>}
   * @memberof TransactionService
   */
  async processHiveAppOperation(
    cb: (opBuilder: ITransaction) => void,
    transactionOptions: TransactionOptions = {}
  ): Promise<TransactionBroadcastResult> {
    const defaultTransactionOptions = {
      observe: false
    };

    const { observe } = {
      ...defaultTransactionOptions,
      ...transactionOptions
    };

    const txBuilder = await (await hiveChainService.getHiveChain()).createTransaction();

    // Create transaction from operation
    cb(txBuilder);

    // Validate transaction
    txBuilder.validate();

    // Get signature of transaction
    const signature = await this.signTransaction(txBuilder);
    // Add signature to transaction
    txBuilder.sign(signature);

    if (observe) {
      return await this.broadcastAndObserveTransaction(txBuilder);
    } else {
      return await this.broadcastTransaction(txBuilder);
    }
  }

  /**
   * Sign transaction using smart-signer.
   *
   * @param {ITransaction} txBuilder
   * @return {*}  {Promise<string>}
   * @memberof TransactionService
   */
  signTransaction(txBuilder: ITransaction): Promise<string> {
    const signer = getSigner(this.signerOptions);
    return signer.signTransaction({
      digest: txBuilder.sigDigest,
      transaction: txBuilder.transaction
    });
  }

  /**
   * Broadcasts transaction. Resolves after sending request to API
   * server. Does not wait for applying transaction in blockchain.
   *
   * @param {ITransaction} txBuilder
   * @return {*}  {Promise<TransactionBroadcastResult>}
   * @memberof TransactionService
   */
  async broadcastTransaction(txBuilder: ITransaction): Promise<TransactionBroadcastResult> {
    // Create broadcast request
    const broadcastReq = new BroadcastTransactionRequest(txBuilder);
    // Do broadcast
    const transactionId = txBuilder.id;
    logger.info('Broadcasting transaction id: %o, body: %o', transactionId, txBuilder.toApi());
    await (
      await hiveChainService.getHiveChain()
    ).api.network_broadcast_api.broadcast_transaction(broadcastReq);
    return { transactionId };
  }

  /**
   * Create and start bot (block scanner) if needed, broadcast
   * transaction, wait until bot reports applying transaction into Hive
   * blockchain, stop and destroy bot if needed, then resolve. When bot
   * doesn't find the transaction, it will throw after transaction
   * expiration time plus `throwAfter`.
   *
   * @param {ITransaction} txBuilder
   * @param {number} [throwAfter=60 * 1000]
   * @return {*}  {Promise<TransactionBroadcastResult>}
   * @memberof TransactionService
   */
  async broadcastAndObserveTransaction(
    txBuilder: ITransaction,
    throwAfter = 60 * 1000
  ): Promise<TransactionBroadcastResult> {
    try {
      // Create bot
      if (!this.bot) {
        logger.info('Creating bot');
        const hiveChain = await hiveChainService.getHiveChain();
        this.bot = new WorkerBee({
          explicitChain: hiveChain as any // TODO: replace this after workerbee is updated
        });
        this.bot.on('error', (error) => logger.error(error));
        this.bot.on('block', (data) => logger.info('Bot is scanning block no. %o', data.number));
      }
      // Start bot
      if (this.observedTransactionsCounter++ === 0) {
        logger.info('Starting bot');
        await this.bot.start();
      }

      // Do broadcast
      const transactionId = txBuilder.id;
      logger.info('Broadcasting transaction id: %o, body: %o', transactionId, txBuilder.toApi());
      const startedAt = Date.now();
      const observer = await this.bot.broadcast(txBuilder.transaction, { throwAfter });

      // Observe if transaction has been applied into blockchain (scan
      // blocks and look for transactionId).
      logger.info('Starting observing transaction id: %o', transactionId);
      const result: TransactionBroadcastResult = await new Promise((resolve, reject) => {
        const subscription = observer.subscribe({
          next: (data: ITransactionData) => {
            const {
              block: { number: blockNumber }
            } = data;
            logger.info(
              'Transaction id: %o applied on block: %o, found after %sms',
              transactionId,
              blockNumber,
              Date.now() - startedAt
            );
            subscription.unsubscribe();
            resolve({ transactionId, blockNumber });
          },
          error(error) {
            logger.error(
              'Transaction id: %o observation time expired: %o',
              transactionId,
              txBuilder.toApi(),
              error
            );
            subscription.unsubscribe();
            reject(error);
          }
        });
      });
      return result;
    } catch (error) {
      logger.error('Got error, logging and rethrowing it: %o', error);
      throw error;
    } finally {
      if (--this.observedTransactionsCounter === 0) {
        // Stop bot
        if (this.bot) {
          logger.info('Stopping bot');
          await this.bot.stop();
        }
        // Destroy bot
        logger.info('Destroying bot');
        this.bot = undefined;
      }
    }
  }

  async upVote(
    author: string,
    permlink: string,
    weight = 10000,
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.processHiveAppOperation((builder) => {
      builder
        .pushOperation({
          vote: {
            voter: this.signerOptions.username,
            author,
            permlink,
            weight
          }
        });
    }, transactionOptions);
  }

  async downVote(
    author: string,
    permlink: string,
    weight = -10000,
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.processHiveAppOperation((builder) => {
      builder
        .pushOperation({
          vote: {
            voter: this.signerOptions.username,
            author,
            permlink,
            weight
          }
        });
    }, transactionOptions);
  }

  async subscribe(community: string, transactionOptions: TransactionOptions = {}) {
    return await this.processHiveAppOperation((builder) => {
      builder.pushOperation(
        new CommunityOperation().subscribe(community).authorize(this.signerOptions.username)
      );
    }, transactionOptions);
  }

  async unsubscribe(community: string, transactionOptions: TransactionOptions = {}) {
    return await this.processHiveAppOperation((builder) => {
      builder.pushOperation(
        new CommunityOperation().unsubscribe(community).authorize(this.signerOptions.username)
      );
    }, transactionOptions);
  }

  async flag(
    community: string,
    username: string,
    permlink: string,
    notes: string,
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.processHiveAppOperation((builder) => {
      builder.pushOperation(
        new CommunityOperation()
          .flagPost(community, username, permlink, notes)
          .authorize(this.signerOptions.username)
      );
    }, transactionOptions);
  }
  async pin(
    community: string,
    username: string,
    permlink: string,
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.processHiveAppOperation((builder) => {
      builder.push(
        new CommunityOperationBuilder()
          .pinPost(community, username, permlink)
          .authorize(this.signerOptions.username)
          .build()
      );
    }, transactionOptions);
  }
  async unpin(
    community: string,
    username: string,
    permlink: string,
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.processHiveAppOperation((builder) => {
      builder.push(
        new CommunityOperationBuilder()
          .unpinPost(community, username, permlink)
          .authorize(this.signerOptions.username)
          .build()
      );
    }, transactionOptions);
  }

  async mutePost(
    community: string,
    username: string,
    permlink: string,
    notes: string,
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.processHiveAppOperation((builder) => {
      builder.push(
        new CommunityOperationBuilder()
          .mutePost(community, username, permlink, notes)
          .authorize(this.signerOptions.username)
          .build()
      );
    }, transactionOptions);
  }

  async unmutePost(
    community: string,
    username: string,
    permlink: string,
    notes: string,
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.processHiveAppOperation((builder) => {
      builder.push(
        new CommunityOperationBuilder()
          .unmutePost(community, username, permlink, notes)
          .authorize(this.signerOptions.username)
          .build()
      );
    }, transactionOptions);
  }

  async setUserTitle(
    community: string,
    username: string,
    title: string,
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.processHiveAppOperation((builder) => {
      builder.push(
        new CommunityOperationBuilder()
          .setUserTitle(community, username, title)
          .authorize(this.signerOptions.username)
          .build()
      );
    }, transactionOptions);
  }

  async reblog(username: string, permlink: string, transactionOptions: TransactionOptions = {}) {
    return await this.processHiveAppOperation((builder) => {
      builder.pushOperation(
        new FollowOperation()
          .reblog(this.signerOptions.username, username, permlink)
          .authorize(this.signerOptions.username)
      );
    }, transactionOptions);
  }

  async follow(username: string, transactionOptions: TransactionOptions = {}) {
    return await this.processHiveAppOperation((builder) => {
      builder.pushOperation(
        new FollowOperation()
          .followBlog(this.signerOptions.username, username)
          .authorize(this.signerOptions.username)
      );
    }, transactionOptions);
  }

  async unfollow(username: string, transactionOptions: TransactionOptions = {}) {
    return await this.processHiveAppOperation((builder) => {
      builder.pushOperation(
        new FollowOperation()
          .unfollowBlog(this.signerOptions.username, username)
          .authorize(this.signerOptions.username)
      );
    }, transactionOptions);
  }

  async mute(otherBlogs: string, blog = '', transactionOptions: TransactionOptions = {}) {
    return await this.processHiveAppOperation((builder) => {
      builder.pushOperation(
        new FollowOperation()
          .muteBlog(this.signerOptions.username, blog, ...otherBlogs.split(', '))
          .authorize(this.signerOptions.username)
      );
    }, transactionOptions);
  }

  async unmute(blog: string, transactionOptions: TransactionOptions = {}) {
    return await this.processHiveAppOperation((builder) => {
      builder.pushOperation(
        new FollowOperation()
          .unmuteBlog(this.signerOptions.username, blog)
          .authorize(this.signerOptions.username)
      );
    }, transactionOptions);
  }

  async resetBlogList(transactionOptions: TransactionOptions = {}) {
    return await this.processHiveAppOperation((builder) => {
      builder.pushOperation(
        new FollowOperation()
          .resetBlogList(EFollowBlogAction.MUTE_BLOG, this.signerOptions.username, 'all')
          .authorize(this.signerOptions.username)
      );
    }, transactionOptions);
  }

  async blacklistBlog(otherBlogs: string, blog = '', transactionOptions: TransactionOptions = {}) {
    return await this.processHiveAppOperation((builder) => {
      builder.pushOperation(
        new FollowOperation()
          .blacklistBlog(this.signerOptions.username, blog, ...otherBlogs.split(', '))
          .authorize(this.signerOptions.username)
      );
    }, transactionOptions);
  }

  async unblacklistBlog(blog: string, transactionOptions: TransactionOptions = {}) {
    return await this.processHiveAppOperation((builder) => {
      builder.pushOperation(
        new FollowOperation()
          .unblacklistBlog(this.signerOptions.username, blog)
          .authorize(this.signerOptions.username)
      );
    }, transactionOptions);
  }

  async followBlacklistBlog(otherBlogs: string, blog = '', transactionOptions: TransactionOptions = {}) {
    return await this.processHiveAppOperation((builder) => {
      builder.pushOperation(
        new FollowOperation()
          .followBlacklistBlog(this.signerOptions.username, blog, ...otherBlogs.split(', '))
          .authorize(this.signerOptions.username)
      );
    }, transactionOptions);
  }

  async unfollowBlacklistBlog(blog: string, transactionOptions: TransactionOptions = {}) {
    return await this.processHiveAppOperation((builder) => {
      builder.pushOperation(
        new FollowOperation()
          .unfollowBlacklistBlog(this.signerOptions.username, blog)
          .authorize(this.signerOptions.username)
      );
    }, transactionOptions);
  }

  async followMutedBlog(otherBlogs: string, blog = '', transactionOptions: TransactionOptions = {}) {
    return await this.processHiveAppOperation((builder) => {
      builder.pushOperation(
        new FollowOperation()
          .followMutedBlog(this.signerOptions.username, blog, ...otherBlogs.split(', '))
          .authorize(this.signerOptions.username)
      );
    }, transactionOptions);
  }

  async resetAllBlog(transactionOptions: TransactionOptions = {}) {
    return await this.processHiveAppOperation((builder) => {
      builder.pushOperation(
        new FollowOperation()
          .resetAllBlog(this.signerOptions.username, 'all')
          .authorize(this.signerOptions.username)
      );
    }, transactionOptions);
  }

  async resetBlacklistBlog(transactionOptions: TransactionOptions = {}) {
    return await this.processHiveAppOperation((builder) => {
      builder.pushOperation(
        new FollowOperation()
          .resetBlacklistBlog(this.signerOptions.username, 'all')
          .authorize(this.signerOptions.username)
      );
    }, transactionOptions);
  }

  async resetFollowBlacklistBlog(transactionOptions: TransactionOptions = {}) {
    return await this.processHiveAppOperation((builder) => {
      builder.pushOperation(
        new FollowOperation()
          .resetFollowBlacklistBlog(this.signerOptions.username, 'all')
          .authorize(this.signerOptions.username)
      );
    }, transactionOptions);
  }

  async resetFollowMutedBlog(transactionOptions: TransactionOptions = {}) {
    return await this.processHiveAppOperation((builder) => {
      builder.pushOperation(
        new FollowOperation()
          .resetFollowMutedBlog(this.signerOptions.username, 'all')
          .authorize(this.signerOptions.username)
      );
    }, transactionOptions);
  }

  async unfollowMutedBlog(blog: string, transactionOptions: TransactionOptions = {}) {
    return await this.processHiveAppOperation((builder) => {
      builder.pushOperation(
        new FollowOperation()
          .unfollowMutedBlog(this.signerOptions.username, blog)
          .authorize(this.signerOptions.username)
      );
    }, transactionOptions);
  }

  async comment(
    parentAuthor: string,
    parentPermlink: string,
    body: string,
    preferences: Preferences,
    transactionOptions: TransactionOptions = {}
  ) {
    const chain = await hiveChainService.getHiveChain();

    const replyOperationData: IReplyData = {
      parentAuthor,
      parentPermlink,
      author: this.signerOptions.username,
      body,
      permlink: `re-${parentAuthor.replaceAll('.', '-')}-${Date.now()}`,
    };

    if (preferences.comment_rewards === '100%') {
      replyOperationData.percentHbd = 0;
    }
    if (preferences.comment_rewards === '50%' || preferences.comment_rewards === '0%') {
      replyOperationData.percentHbd = 10000;
    }
    if (preferences.comment_rewards === '0%') {
      replyOperationData.maxAcceptedPayout = chain.hbd(0);
    }

    const reply = new ReplyOperation(replyOperationData);

    return await this.processHiveAppOperation((builder) => {
      builder.pushOperation(reply);
    }, transactionOptions);
  }

  async updateComment(
    parentAuthor: string,
    parentPermlink: string,
    permlink: string,
    body: string,
    transactionOptions: TransactionOptions = {}
  ) {
    const reply = new ReplyOperation({
      parentAuthor,
      parentPermlink,
      author: this.signerOptions.username,
      body,
      jsonMetadata: {},
      permlink
    });

    return await this.processHiveAppOperation((builder) => {
      builder.pushOperation(reply);
    }, transactionOptions);
  }

  async post(
    permlink: string,
    title: string,
    body: string,
    beneficiaries: Beneficiarie[],
    maxAcceptedPayout: NaiAsset,
    tags: string[],
    category: string,
    summary: string,
    altAuthor: string,
    payoutType: string,
    image?: string,
    transactionOptions: TransactionOptions = {},
    editMode = false
  ) {
    const chain = await hiveChainService.getHiveChain();

    const postData: IArticle = {
      category: category !== 'blog' ? category : tags[0],
      tags,
      author: this.signerOptions.username,
      title,
      body,
      permlink,
      alternativeAuthor: altAuthor,
      images: [image ? image : ''],
      jsonMetadata: {
        summary
      }
    };

    if (!editMode) {
      postData.maxAcceptedPayout = maxAcceptedPayout;

      if (payoutType === '100%') {
        postData.percentHbd = 0;
      }
      if (payoutType === '50%' || payoutType === '0%') {
        postData.percentHbd = 10000;
      }
      if (payoutType === '0%') {
        postData.maxAcceptedPayout = chain.hbd(0);
      }

      postData.beneficiaries = beneficiaries.map(({ account, weight }) => ({
        account,
        weight: Number(weight)
      }))
    }

    const blogPost = new BlogPostOperation(postData);

    return await this.processHiveAppOperation((builder) => {
    builder.pushOperation(blogPost);
    }, transactionOptions);
  }

  async updateProfile(
    profile_image?: string,
    cover_image?: string,
    name?: string,
    about?: string,
    location?: string,
    website?: string,
    witness_owner?: string,
    witness_description?: string,
    blacklist_description?: string,
    muted_list_description?: string,
    version: number = 2, // signal upgrade to posting_json_metadata
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.processHiveAppOperation((builder) => {
      builder
        .pushOperation({
          account_update2: {
            account: this.signerOptions.username,
            extensions: [],
            json_metadata: '',
            posting_json_metadata: JSON.stringify({
              profile: {
                profile_image,
                cover_image,
                name,
                about,
                location,
                website,
                witness_owner,
                witness_description,
                blacklist_description,
                muted_list_description,
                version
              }
            })
          }
        });
    }, transactionOptions);
  }

  async deleteComment(permlink: string, transactionOptions: TransactionOptions = {}) {
    return await this.processHiveAppOperation((builder) => {
      builder.pushOperation({
        delete_comment: {
          author: this.signerOptions.username,
          permlink: permlink
        }
      });
    }, transactionOptions);
  }

  async updateProposalVotes(
    proposal_ids: string[],
    approve: boolean,
    extensions: future_extensions[],
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.processHiveAppOperation((builder) => {
      builder
        .pushOperation({
          update_proposal_votes: {
            voter: this.signerOptions.username,
            proposal_ids,
            approve,
            extensions
          }
        });
    }, transactionOptions);
  }

  async markAllNotificationAsRead(date: string, transactionOptions: TransactionOptions = {}) {
    return await this.processHiveAppOperation((builder) => {
      builder
        .pushOperation({
          custom_json: {
            id: 'notify',
            json: JSON.stringify(['setLastRead', { date: date }]),
            required_auths: [],
            required_posting_auths: [this.signerOptions.username]
          }
        });
    }, transactionOptions);
  }

  async claimRewards(account: ApiAccount, transactionOptions: TransactionOptions = {}) {
    return await this.processHiveAppOperation((builder) => {
      builder.pushOperation({
        claim_reward_balance: {
          account: this.signerOptions.username,
          reward_hive: account.reward_hive_balance,
          reward_hbd: account.reward_hbd_balance,
          reward_vests: account.reward_vesting_balance
        }
      });
    }, transactionOptions);
  }

  async witnessVote(
    account: string,
    witness: string,
    approve: boolean,
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.processHiveAppOperation((builder) => {
      builder.pushOperation({
        account_witness_vote: {
          account,
          witness,
          approve
        }
      });
    }, transactionOptions);
  }

  async transferToSavings(
    amount: asset,
    fromAccount: string,
    memo: string,
    toAccount: string,
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.processHiveAppOperation((builder) => {
      builder.pushOperation({
        transfer_to_savings: {
          amount,
          from_account: fromAccount,
          memo,
          to_account: toAccount
        }
      });
    }, transactionOptions);
  }

  async transfer(
    amount: asset,
    fromAccount: string,
    memo: string,
    toAccount: string,
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.processHiveAppOperation((builder) => {
      builder.pushOperation({
        transfer: {
          amount,
          from_account: fromAccount,
          memo,
          to_account: toAccount
        }
      });
    }, transactionOptions);
  }

  async transferToVesting(
    amount: asset,
    fromAccount: string,
    toAccount: string,
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.processHiveAppOperation((builder) => {
      builder.pushOperation({
        transfer_to_vesting: {
          amount,
          from_account: fromAccount,
          to_account: toAccount
        }
      });
    }, transactionOptions);
  }

  async withdrawFromVesting(
    account: string,
    vestingShares: asset,
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.processHiveAppOperation((builder) => {
      builder.pushOperation({
        withdraw_vesting: {
          account,
          vesting_shares: vestingShares
        }
      });
    }, transactionOptions);
  }

  async delegateVestingShares(
    delegator: string,
    delegatee: string,
    vestingShares: asset,
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.processHiveAppOperation((builder) => {
      builder.pushOperation({
        delegate_vesting_shares: {
          delegator,
          delegatee,
          vesting_shares: vestingShares
        }
      });
    }, transactionOptions);
  }

  async changeMasterPassword(
    account: string,
    newOwner: string,
    newActive: string,
    newPosting: string,
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.processHiveAppOperation((builder) => {
      builder.pushOperation({
        account_update2: {
          account,
          owner: {
            weight_threshold: 1,
            key_auths: {
              [newOwner]: 1
            },
            account_auths: {}
          },
          active: {
            weight_threshold: 1,
            key_auths: {
              [newActive]: 1
            },
            account_auths: {}
          },
          posting: {
            weight_threshold: 1,
            key_auths: {
              [newPosting]: 1
            },
            account_auths: {}
          },
          json_metadata: '', // ignore change
          posting_json_metadata: '', // ignore change
          extensions: []
        }
      });
    }, transactionOptions);
  }

  async createClaimedAccount(
    creator: string,
    memoKey: string,
    newAccountName: string,
    jsonMetadata: string,
    active?: authority,
    owner?: authority,
    posting?: authority,
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.processHiveAppOperation((builder) => {
      builder.pushOperation({
        create_claimed_account: {
          creator,
          active,
          owner,
          posting,
          memo_key: memoKey,
          new_account_name: newAccountName,
          json_metadata: jsonMetadata,
          extensions: []
        }
      });
    }, transactionOptions);
  }

  async accountCreate(
    fee: asset,
    memoKey: string,
    newAccountName: string,
    jsonMetadata: string,
    creator: string,
    active?: authority,
    owner?: authority,
    posting?: authority,
    transactionOptions: TransactionOptions = {}
  ) {
    return (
      await this.processHiveAppOperation((builder) => {
        builder.pushOperation({
          account_create: {
            fee,
            active,
            owner,
            posting,
            creator,
            memo_key: memoKey,
            new_account_name: newAccountName,
            json_metadata: jsonMetadata
          }
        });
      }),
      transactionOptions
    );
  }
}

export const transactionService = new TransactionService();
