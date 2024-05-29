import {
  ApiAccount,
  ArticleBuilder,
  BroadcastTransactionRequest,
  CommunityOperationBuilder,
  EFollowBlogAction,
  FollowOperationBuilder,
  ITransactionBuilder,
  NaiAsset,
  ReplyBuilder,
  WaxChainApiError,
  future_extensions
} from '@hiveio/wax';
import { toast, Toast } from '@hive/ui/components/hooks/use-toast';
import { getSigner } from '@smart-signer/lib/signer/get-signer';
import { SignerOptions } from '@smart-signer/lib/signer/signer';
import { hiveChainService } from './lib/hive-chain-service';
import { Beneficiarie, Preferences } from './lib/app-types';
import WorkerBee, { ITransactionData, IWorkerBee } from "@hiveio/workerbee";

import { getLogger } from '@hive/ui/lib/logging';
const logger = getLogger('app');

export type TransactionErrorCallback = (error: any) => any;

export type TransactionBroadcastCallback =
  (txBuilder: ITransactionBuilder) => Promise<TransactionBroadcastResult>;

export interface TransactionOptions {
  onError?: TransactionErrorCallback;
  observe?: boolean;
}

export interface TransactionBroadcastResult {
  blockNumber?: number;
  transactionId: string;
}

export class TransactionService {
  /**
   * Default error description, used when trying to get smarter
   * description fails
   *
   * @memberof TransactionService
   */
  errorDescription = 'Transaction broadcast error';

  /**
   * Strings to look for in error's stuff. When found, we can assume
   * that we caught well known error and we can use these strings in
   * message for user safely.
   *
   * @memberof TransactionService
   */
  wellKnownErrorDescriptions = [
    'Your current vote on this comment is identical to this vote',
    'Account does not have enough mana to downvote',
    'You may only post once every 5 minutes',
  ];

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
   * transaction has been applied in blockchain (if one wanted this).
   * The method does this by default:
   *
   * 1. Swallows all errors and informs user about them via toast
   *    service. When you want to do something else with error pass
   *    `options.onError` callback.
   * 2. Runs `TransactionService.broadcastTransaction` and this method
   *    does not observe if transaction has been applied in blockchain –
   *    resolves just after sending transaction to API server. When you
   *    want to observe transaction and resolve after applying it in
   *    blockchain, pass `options.observe` set to true. Then method
   *    `TransactionService.broadcastAndObserveTransaction` will be run
   *    and this resolves after applying transaction in blockchain.
   *
   * @param {(opBuilder: ITransactionBuilder) => void} cb
   * @param {TransactionOptions} [transactionOptions={}]
   * @return {*}  {Promise<TransactionBroadcastResult>}
   * @memberof TransactionService
   */
  async processHiveAppOperation(
    cb: (opBuilder: ITransactionBuilder) => void,
    transactionOptions: TransactionOptions = {}
  ): Promise<TransactionBroadcastResult> {

    const defaultTransactionOptions = {
      onError: (error: any): void => this.handleError(error),
      observe: false,
    }

    const { onError, observe } = {
      ...defaultTransactionOptions,
      ...transactionOptions
    };

    try {
      const txBuilder = await (
        await hiveChainService.getHiveChain()
      ).getTransactionBuilder();

      // Create transaction from operation
      cb(txBuilder);

      // Validate transaction
      txBuilder.validate();

      // Get signature of transaction
      const signature = await this.signTransaction(txBuilder);
      // Add signature to transaction
      txBuilder.build(signature);

      if (observe) {
        return await this.broadcastAndObserveTransaction(txBuilder);
      } else {
        return await this.broadcastTransaction(txBuilder);
      }

    } catch (error) {
      onError(error);
      return { transactionId: '' };
    }

  }

  /**
   * Sign transaction using smart-signer.
   *
   * @param {ITransactionBuilder} txBuilder
   * @return {*}  {Promise<string>}
   * @memberof TransactionService
   */
  signTransaction(txBuilder: ITransactionBuilder): Promise<string> {
    const signer = getSigner(this.signerOptions);
    return signer.signTransaction({
      digest: txBuilder.sigDigest,
      transaction: txBuilder.build()
    });
  }

  /**
   * Broadcast transaction. Resolves after sending request to API
   * server. Does not wait for applying transaction in blockchain.
   *
   * @param {ITransactionBuilder} txBuilder
   * @return {*}  {Promise<void>}
   * @memberof TransactionService
   */
  async broadcastTransaction(txBuilder: ITransactionBuilder): Promise<TransactionBroadcastResult> {
    // Create broadcast request
    const broadcastReq = new BroadcastTransactionRequest(txBuilder);
    // Do broadcast
    const transactionId = txBuilder.id;
    logger.info('Broadcasting transaction id: %o, body: %o',
        transactionId, txBuilder.toApi());
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
   * @param {ITransactionBuilder} txBuilder
   * @param {number} [throwAfter=60 * 1000]
   * @return {*}  {Promise<TransactionBroadcastResult>}
   * @memberof TransactionService
   */
  async broadcastAndObserveTransaction(
    txBuilder: ITransactionBuilder,
    throwAfter = 60 * 1000
  ): Promise<TransactionBroadcastResult> {
    try {
      // Create bot
      if (!this.bot) {
        const signer = getSigner(this.signerOptions);
        logger.info('Creating bot');
        this.bot = new WorkerBee({
          chainOptions: {
            chainId: signer.chainId,
            apiEndpoint: signer.apiEndpoint,
          }
        });
        this.bot.on("error", logger.error);
      }
      // Start bot
      if (this.observedTransactionsCounter++ === 0) {
        logger.info('Starting bot');
        await this.bot.start();
      }

      // Do broadcast
      const transactionId = txBuilder.id;
      logger.info('Broadcasting transaction id: %o, body: %o',
          transactionId, txBuilder.toApi());
      const startedAt = Date.now();
      const observer = await this.bot.broadcast(
        txBuilder.build(),
        { throwAfter }
      );

      // Observe if transaction has been applied into blockchain (scan
      // blocks and look for transactionId).
      logger.info('Starting observing transaction id: %o', transactionId);
      const result: TransactionBroadcastResult = await new Promise((resolve, reject) => {
        const subscription = observer.subscribe({
          next: (data: ITransactionData) => {
            const { block: { number: blockNumber } } = data;
            logger.info('Transaction id: %o applied on block: %o, found after %sms',
              transactionId, blockNumber, Date.now() - startedAt);
            subscription.unsubscribe();
            resolve({ transactionId, blockNumber });
          },
          error(error) {
            logger.error("Transaction id: %o observation time expired: %o",
              transactionId, txBuilder.toApi(), error);
            subscription.unsubscribe();
            reject(error);
          },
        });
      });
      return result;
    } catch (error) {
      logger.error("Error: %o", error);
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
    return await this.processHiveAppOperation(
      (builder) => {
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
      },
        transactionOptions
    );
  }

  async downVote(
    author: string,
    permlink: string,
    weight = -10000,
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.processHiveAppOperation(
      (builder) => {
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
      },
      transactionOptions
    );
  }

  async subscribe(
    username: string,
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.processHiveAppOperation(
      (builder) => {
        builder.push(
          new CommunityOperationBuilder()
            .subscribe(username)
            .authorize(this.signerOptions.username)
            .build()
        );
      },
      transactionOptions
    );
  }

  async unsubscribe(
    username: string,
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.processHiveAppOperation(
      (builder) => {
        builder.push(
          new CommunityOperationBuilder()
            .unsubscribe(username)
            .authorize(this.signerOptions.username)
            .build()
        );
      },
      transactionOptions
    );
  }

  async flag(
    community: string,
    username: string,
    permlink: string,
    notes: string,
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.processHiveAppOperation(
      (builder) => {
        builder.push(
          new CommunityOperationBuilder()
            .flagPost(community, username, permlink, notes)
            .authorize(this.signerOptions.username)
            .build()
        );
      },
      transactionOptions
    );
  }

  async reblog(
    username: string,
    permlink: string,
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.processHiveAppOperation(
      (builder) => {
        builder.push(
          new FollowOperationBuilder()
            .reblog(this.signerOptions.username, username, permlink)
            .authorize(this.signerOptions.username)
            .build()
        );
      },
      transactionOptions
    );
  }

  async follow(
    username: string,
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.processHiveAppOperation(
      (builder) => {
        builder.push(
          new FollowOperationBuilder()
            .followBlog(this.signerOptions.username, username)
            .authorize(this.signerOptions.username)
            .build()
        );
      },
      transactionOptions
    );
  }

  async unfollow(
    username: string,
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.processHiveAppOperation(
      (builder) => {
        builder.push(
          new FollowOperationBuilder()
            .unfollowBlog(this.signerOptions.username, username)
            .authorize(this.signerOptions.username)
            .build()
        );
      },
      transactionOptions
    );
  }

  async mute(
    otherBlogs: string,
    blog = '',
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.processHiveAppOperation(
      (builder) => {
        builder.push(
          new FollowOperationBuilder()
            .muteBlog(this.signerOptions.username, blog, ...otherBlogs.split(', '))
            .authorize(this.signerOptions.username)
            .build()
        );
      },
      transactionOptions
    );
  }

  async unmute(
    blog: string,
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.processHiveAppOperation(
      (builder) => {
        builder.push(
          new FollowOperationBuilder()
            .unmuteBlog(this.signerOptions.username, blog)
            .authorize(this.signerOptions.username)
            .build()
        );
      },
      transactionOptions
    );
  }

  async resetBlogList(
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.processHiveAppOperation(
      (builder) => {
        builder.push(
          new FollowOperationBuilder()
            .resetBlogList(EFollowBlogAction.MUTE_BLOG, this.signerOptions.username, 'all')
            .authorize(this.signerOptions.username)
            .build()
        );
      },
      transactionOptions
    );
  }

  async blacklistBlog(
    otherBlogs: string,
    blog = '',
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.processHiveAppOperation(
      (builder) => {
        builder.push(
          new FollowOperationBuilder()
            .blacklistBlog(this.signerOptions.username, blog, ...otherBlogs.split(', '))
            .authorize(this.signerOptions.username)
            .build()
        );
      },
      transactionOptions
    );
  }

  async unblacklistBlog(
    blog: string,
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.processHiveAppOperation(
      (builder) => {
        builder.push(
          new FollowOperationBuilder()
            .unblacklistBlog(this.signerOptions.username, blog)
            .authorize(this.signerOptions.username)
            .build()
        );
      },
      transactionOptions
    );
  }

  async followBlacklistBlog(
    otherBlogs: string,
    blog = '',
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.processHiveAppOperation(
      (builder) => {
        builder.push(
          new FollowOperationBuilder()
            .followBlacklistBlog(this.signerOptions.username, blog, ...otherBlogs.split(', '))
            .authorize(this.signerOptions.username)
            .build()
        );
      },
      transactionOptions
    );
  }

  async unfollowBlacklistBlog(
    blog: string,
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.processHiveAppOperation(
      (builder) => {
        builder.push(
          new FollowOperationBuilder()
            .unfollowBlacklistBlog(this.signerOptions.username, blog)
            .authorize(this.signerOptions.username)
            .build()
        );
      },
      transactionOptions
    );
  }

  async followMutedBlog(
    otherBlogs: string,
    blog = '',
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.processHiveAppOperation(
      (builder) => {
        builder.push(
          new FollowOperationBuilder()
            .followMutedBlog(this.signerOptions.username, blog, ...otherBlogs.split(', '))
            .authorize(this.signerOptions.username)
            .build()
        );
      },
      transactionOptions
    );
  }

  async resetAllBlog(
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.processHiveAppOperation(
      (builder) => {
        builder.push(
          new FollowOperationBuilder()
            .resetAllBlog(this.signerOptions.username, 'all')
            .authorize(this.signerOptions.username)
            .build()
        );
      },
      transactionOptions
    );
  }

  async resetBlacklistBlog(
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.processHiveAppOperation(
      (builder) => {
        builder.push(
          new FollowOperationBuilder()
            .resetBlacklistBlog(this.signerOptions.username, 'all')
            .authorize(this.signerOptions.username)
            .build()
        );
      },
      transactionOptions
    );
  }

  async resetFollowBlacklistBlog(
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.processHiveAppOperation(
      (builder) => {
        builder.push(
          new FollowOperationBuilder()
            .resetFollowBlacklistBlog(this.signerOptions.username, 'all')
            .authorize(this.signerOptions.username)
            .build()
        );
      },
      transactionOptions
    );
  }

  async resetFollowMutedBlog(
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.processHiveAppOperation(
      (builder) => {
        builder.push(
          new FollowOperationBuilder()
            .resetFollowMutedBlog(this.signerOptions.username, 'all')
            .authorize(this.signerOptions.username)
            .build()
        );
      },
      transactionOptions
    );
  }

  async unfollowMutedBlog(
    blog: string,
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.processHiveAppOperation(
      (builder) => {
        builder.push(
          new FollowOperationBuilder()
            .unfollowMutedBlog(this.signerOptions.username, blog)
            .authorize(this.signerOptions.username)
            .build()
        );
      },
      transactionOptions
    );
  }

  async comment(
    parentAuthor: string,
    parentPermlink: string,
    body: string,
    preferences: Preferences,
    transactionOptions: TransactionOptions = {}
  ) {
    const chain = await hiveChainService.getHiveChain();
    return await this.processHiveAppOperation(
      (builder) => {
        builder
          .useBuilder(
            ReplyBuilder,
            (replyBuilder) => {
              if (preferences.comment_rewards === '100%') {
                replyBuilder.setPercentHbd(0);
              }
              if (preferences.comment_rewards === '50%' || preferences.comment_rewards === '0%') {
                replyBuilder.setPercentHbd(10000);
              }
              if (preferences.comment_rewards === '0%') {
                replyBuilder.setMaxAcceptedPayout(chain.hbd(0));
              }
            },
            parentAuthor,
            parentPermlink,
            this.signerOptions.username,
            body
          )
          .build();
      },
      transactionOptions
    );
  }

  async updateComment(
    parentAuthor: string,
    parentPermlink: string,
    permlink: string,
    body: string,
    comment_rewards: '0%' | '50%' | '100%',
    transactionOptions: TransactionOptions = {}
  ) {
    const chain = await hiveChainService.getHiveChain();
    return await this.processHiveAppOperation(
      (builder) => {
        builder
          .useBuilder(
            ReplyBuilder,
            (replyBuilder) => {
              if (comment_rewards === '100%') {
                replyBuilder.setPercentHbd(0);
              }
              if (comment_rewards === '50%' || comment_rewards === '0%') {
                replyBuilder.setPercentHbd(10000);
              }
              if (comment_rewards === '0%') {
                replyBuilder.setMaxAcceptedPayout(chain.hbd(0));
              }
            },
            parentAuthor,
            parentPermlink,
            this.signerOptions.username,
            body,
            {},
            permlink
          )
          .build();
      },
      transactionOptions
    );
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
    transactionOptions: TransactionOptions = {}
  ) {
    const chain = await hiveChainService.getHiveChain();
    return await this.processHiveAppOperation((builder) => {
      builder
        .useBuilder(
          ArticleBuilder,
          (articleBuilder) => {
            articleBuilder
              .setCategory(category !== 'blog' ? category : tags[0])
              .setMaxAcceptedPayout(maxAcceptedPayout)
              .pushTags(...tags)
              .pushMetadataProperty({ summary: summary })
              .setAlternativeAuthor(altAuthor)
              .pushImages(image ? image : '');

            if (payoutType === '100%') {
              articleBuilder.setPercentHbd(0);
            }
            if (payoutType === '50%' || payoutType === '0%') {
              articleBuilder.setPercentHbd(10000);
            }
            if (payoutType === '0%') {
              articleBuilder.setMaxAcceptedPayout(chain.hbd(0));
            }

              beneficiaries.forEach((beneficiary) => {
                articleBuilder.addBeneficiary(beneficiary.account, Number(beneficiary.weight));
              });
            },
            this.signerOptions.username,
            title,
            body,
            {},
            permlink
          )
          .build();
      },
      transactionOptions
    );
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
    return await this.processHiveAppOperation(
      (builder) => {
        builder
          .push({
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
          })
          .build();
      },
      transactionOptions
    );
  }

  async deleteComment(
    permlink: string,
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.processHiveAppOperation(
      (builder) => {
        builder.push({
          delete_comment: {
            author: this.signerOptions.username,
            permlink: permlink
          }
        });
      },
      transactionOptions
    );
  }

  async updateProposalVotes(
    proposal_ids: string[],
    approve: boolean,
    extensions: future_extensions[],
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.processHiveAppOperation(
      (builder) => {
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
      },
      transactionOptions
    );
  }

  async markAllNotificationAsRead(
    date: string,
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.processHiveAppOperation(
      (builder) => {
        builder
          .push({
            custom_json: {
              id: 'notify',
              json: JSON.stringify(['setLastRead', { date: date }]),
              required_auths: [],
              required_posting_auths: [this.signerOptions.username]
            }
          })
          .build();
      },
      transactionOptions
    );
  }

  async claimRewards(
    account: ApiAccount,
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.processHiveAppOperation(
      (builder) => {
        builder.push({
          claim_reward_balance: {
            account: this.signerOptions.username,
            reward_hive: account.reward_hive_balance,
            reward_hbd: account.reward_hbd_balance,
            reward_vests: account.reward_vesting_balance
          }
        });
      },
      transactionOptions
    );
  }

  /**
   * Handle error by trying to find a message for user in error stuff,
   * display found message in toast, then swallow error.
   *
   * @param {*} e
   * @param {Toast} [toastOptions={}]
   * @memberof TransactionService
   */
  handleError(e: any, toastOptions: Toast = {}) {
    logger.error('Got error: %o', e);
    const isError = (err: unknown): err is Error => err instanceof Error;
    const isWaxError = (err: unknown): err is WaxChainApiError => err instanceof WaxChainApiError;

    let description = 'Operation failed';

    if (!toastOptions?.description) {
      let errorDescription;
      if (isWaxError(e)) {
        const error = e as any;
        // this is temporary solution for "wait 5 minut after create another post" error
        if (error?.apiError?.code === -32003) {
          errorDescription = error?.apiError?.data?.stack[0]?.format;
        } else {
          errorDescription = error?.message ?? this.errorDescription;
        }
      } else if (isError(e)) {
        errorDescription = e.message;
      } else if (typeof e === 'string') {
        errorDescription = e;
      }

      let wellKnownErrorDescription;
      for (const wked of this.wellKnownErrorDescriptions) {
        if (errorDescription.includes(wked)) {
          wellKnownErrorDescription = wked;
          break;
        }
      }

      if (wellKnownErrorDescription) {
        description = wellKnownErrorDescription;
      }
    }

    toast({
      description,
      variant: 'destructive',
      ...toastOptions
    });
  }
}

export const transactionService = new TransactionService();
