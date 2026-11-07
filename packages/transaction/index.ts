import {
  ApiAccount,
  BlogPostOperation,
  CommunityOperation,
  FollowOperation,
  type IArticle,
  type IReplyData,
  type ITransaction,
  NaiAsset,
  ReplyOperation,
  type asset as IAsset,
  type authority,
  type future_extensions,
  EAvailableCommunityRoles,
  AccountAuthorityUpdateOperation,
  ESupportedLanguages,
  type IHiveChainInterface,
  type GetDynamicGlobalPropertiesResponse,
  ResourceCreditsOperation,
  type TTransactionPackType
} from '@hiveio/wax';
import { getSigner } from '@smart-signer/lib/signer/get-signer';
import { SignerOptions, SignTransaction } from '@smart-signer/lib/signer/signer';
import { Beneficiarie, Preferences } from '@hive/common-hiveio-packages/wax';
import WorkerBee, { IWorkerBee, WorkerBeeError } from '@hiveio/workerbee';
import { getLogger } from '@hive/ui/lib/logging';
import { createAsset, getAsset } from './lib/utils';
import { getChain, getReadChain } from './lib/chain';
import { PUBLISHING_APP } from './lib/publishing-app';
import { getPostCategory } from './lib/post-category';
import { subscribeToSignerOptions } from './lib/signer-options';
import { requireSignedIn, requireStillSignedInAs } from './lib/signed-out';
import { requireStillSignedInAs as requireStoredUser } from '@smart-signer/lib/signer/signed-in-check';
import { getFindAccounts } from './lib/hive-api';
import { mergePostingJsonMetadata, type ProfileMetadataUpdate } from './lib/profile-metadata';
import { buildCommentJsonMetadata, type CommentBodyMetadata } from './lib/comment-metadata';
import { resolveRequiredKeyType } from './lib/required-key-type';
import { getOperationNames } from './lib/operation-names';
import { WorkerBeeSession } from './lib/workerbee-session';
import {
  type IInclusionWatch,
  INCLUSION_TIMEOUT_MS,
  inclusionLookupVia,
  recordedTransactionId,
  TransactionNotConfirmedError,
  toNotConfirmedError,
  toObservedBroadcastError,
  watchInclusion
} from './lib/transaction-inclusion';
import { buildFollowListReset, type FollowListReset } from './lib/follow-list-reset';
import { readTransactionExpiration, TRANSACTION_EXPIRATION } from './lib/transaction-expiration';
import {
  type BroadcastSettlement,
  type IUnconfirmedBroadcast,
  UnconfirmedBroadcasts
} from './lib/unconfirmed-broadcasts';
import { notifyBroadcastSettled } from './lib/broadcast-settlement';

export { PUBLISHING_APP } from './lib/publishing-app';
export type { ProfileMetadataUpdate } from './lib/profile-metadata';

const logger = getLogger('app');

const lookUpTransactionInclusion = inclusionLookupVia((params) =>
  getReadChain().api.transaction_status_api.find_transaction(params)
);

export type TransactionErrorCallback = (error: any) => any;

export type TransactionBroadcastCallback = (txBuilder: ITransaction) => Promise<TransactionBroadcastResult>;

export interface TransactionOptions {
  observe?: boolean;
  /** Broadcast without waiting, but watch blocks for the transaction; see `TransactionBroadcastResult.included`. */
  confirmInBackground?: boolean;
  singleSignKeyType?: SignTransaction['singleSignKeyType'];
  requiredKeyType?: SignTransaction['requiredKeyType'];
}

export interface TransactionBroadcastResult {
  transactionId: string;
  /**
   * With `confirmInBackground`: true once a block includes the transaction, false when none of the
   * blocks scanned within `INCLUSION_TIMEOUT_MS` did; rejects when no block could be scanned. After a
   * scanner error, the node's `transaction_status_api` answers at the timeout instead, and a failed
   * lookup rejects.
   */
  included?: Promise<boolean>;
  /** With `included`: the transaction's expiration, until which a block may still include it. */
  expiration?: Date;
}

export interface Authorizes {
  weight_threshold: number;
  account_auths: { [key: string]: number };
  key_auths: { [key: string]: number };
}

function transactionExpiration(txBuilder: ITransaction): Date | undefined {
  return readTransactionExpiration(txBuilder.transaction.expiration);
}

function serializedOperations(txBuilder: ITransaction): string {
  return JSON.stringify(txBuilder.transaction.operations);
}

function reportSettled(
  { transactionId }: IUnconfirmedBroadcast,
  settlement: BroadcastSettlement,
  failure?: unknown
): void {
  if (settlement === 'unknown') {
    logger.warn(failure, 'Cannot tell whether transaction %s applied before its expiration', transactionId);
  } else {
    logger.info('Transaction %s that may still apply settled: %s', transactionId, settlement);
  }
  notifyBroadcastSettled({ transactionId, settlement });
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
   * WorkerBee block scanner shared by observed broadcasts, stopped after a minute without one.
   *
   * @memberof TransactionService
   */
  private readonly workerBeeSession = new WorkerBeeSession<IHiveChainInterface, IWorkerBee>({
    getChain: () => this.getChain(),
    createBot: (hiveChain) => new WorkerBee(hiveChain)
  });

  /**
   * This page's broadcasts that may still apply, refused as resends until their expiration, and looked
   * up until then: how each settles is told to `subscribeToBroadcastSettlement`'s listeners.
   *
   * @memberof TransactionService
   */
  private readonly unconfirmedBroadcasts = new UnconfirmedBroadcasts(lookUpTransactionInclusion, reportSettled);

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
   * this resolves after applying transaction in blockchain. Unless the
   * caller names a key in `transactionOptions`, the signer is asked for the
   * key the transaction's operations require (`resolveRequiredKeyType`).
   * Rejects with `SignedOutError`, building nothing, when no user is
   * signed in. The transaction expires `TRANSACTION_EXPIRATION` after
   * the head block, the time the user has to approve it in the signer.
   * Rejects with `EarlierBroadcastPendingError`, signing nothing, when
   * an earlier broadcast of the same operations may still apply.
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
      observe: false,
      singleSignKeyType: undefined,
      transactionOptions: undefined
    };

    // Before `cb`, which may name the signed-in user in the operation
    requireSignedIn(this.signerOptions);

    const { observe, confirmInBackground, singleSignKeyType, requiredKeyType } = {
      ...defaultTransactionOptions,
      ...transactionOptions
    };

    const txBuilder = await (await getChain()).createTransaction(TRANSACTION_EXPIRATION);

    // Create transaction from operation
    cb(txBuilder);

    // Validate transaction
    txBuilder.validate();

    await this.unconfirmedBroadcasts.checkResend(serializedOperations(txBuilder));

    const { signature, pack } = await this.signTransaction(
      txBuilder,
      singleSignKeyType,
      resolveRequiredKeyType({ singleSignKeyType, requiredKeyType }, txBuilder.requiredAuthorities)
    );

    // Add signature to transaction
    txBuilder.addSignature(signature);
    const transactionId = recordedTransactionId(txBuilder, pack);

    if (observe) {
      return await this.broadcastAndObserveTransaction(txBuilder, transactionId);
    } else if (confirmInBackground) {
      return await this.broadcastAndConfirmInBackground(txBuilder, transactionId);
    } else {
      return await this.broadcastTransaction(txBuilder, transactionId);
    }
  }

  /**
   * Sign transaction using smart-signer. Rejects with `SignedOutError`
   * when no user is signed in, or when the user signed out or switched
   * account while signing (a signer's dialog asking for a key was open),
   * here or in another tab. Resolves with the signature and the
   * serialization the signer signed, which decides the transaction's
   * id in a block (`recordedTransactionId`).
   *
   * @param {ITransaction} txBuilder
   * @return {*}  {Promise<{ signature: string; pack: TTransactionPackType }>}
   * @memberof TransactionService
   */
  async signTransaction(
    txBuilder: ITransaction,
    singleSignKeyType?: SignTransaction['singleSignKeyType'],
    requiredKeyType?: SignTransaction['requiredKeyType']
  ): Promise<{ signature: string; pack: TTransactionPackType }> {
    requireSignedIn(this.signerOptions);
    const { username } = this.signerOptions;
    const signer = getSigner(this.signerOptions);
    const signature = await signer.signTransaction({
      digest: txBuilder.sigDigest,
      transaction: txBuilder.transaction,
      singleSignKeyType,
      requiredKeyType
    });
    requireStillSignedInAs(this.signerOptions, username);
    // The signer options follow another tab's sign-out only once its storage event arrives; the stored user already tells
    requireStoredUser(username);
    return { signature, pack: signer.pack };
  }

  /**
   * Broadcasts transaction. Resolves after sending request to API
   * server. Does not wait for applying transaction in blockchain. When
   * the request times out or fails on the network, the node may still have taken the transaction:
   * it rejects with `TransactionNotConfirmedError`. `transactionId` is the
   * id a block lists for it, reported in the result and errors.
   *
   * @param {ITransaction} txBuilder
   * @return {*}  {Promise<TransactionBroadcastResult>}
   * @memberof TransactionService
   */
  async broadcastTransaction(
    txBuilder: ITransaction,
    transactionId = txBuilder.id
  ): Promise<TransactionBroadcastResult> {
    // Do broadcast
    logger.info('Broadcasting transaction id: %s', transactionId);
    logger.debug('Transaction %s body: %o', transactionId, txBuilder.toApi());
    const chain = await getChain();
    try {
      await chain.api.network_broadcast_api.broadcast_transaction({ max_block_age: -1, trx: txBuilder.toApiJson() });
    } catch (caught) {
      const error = toNotConfirmedError(caught, transactionId, transactionExpiration(txBuilder));
      if (error instanceof TransactionNotConfirmedError) {
        logger.warn('Broadcast request for transaction %s got no answer; it may still apply', transactionId);
        this.recordUnconfirmed(txBuilder, transactionId);
      }
      throw error;
    }
    return { transactionId };
  }

  async getChain(): Promise<IHiveChainInterface> {
    return await getChain();
  }

  async getDynamicGlobalProperties(): Promise<GetDynamicGlobalPropertiesResponse> {
    return (await this.getChain()).api.database_api.get_dynamic_global_properties({});
  }

  /**
   * Broadcast transaction with the session's bot (block scanner, created
   * and started if needed), wait until bot reports applying transaction
   * into Hive blockchain, then resolve. The bot stays running for further
   * observed broadcasts and is stopped after a minute without any. When
   * the node accepted the transaction but the bot doesn't find it in a
   * block in time, or a request timed out or failed on the network (the
   * broadcast itself or a read of the bot watching for it), or the bot failed
   * with WorkerBee's own error, it rejects with `TransactionNotConfirmedError`.
   * Such a failure of a read of wax's on-chain verification, made before
   * anything is sent, rejects as is.
   *
   * @param {ITransaction} txBuilder
   * @return {*}  {Promise<TransactionBroadcastResult>}
   * @memberof TransactionService
   */
  async broadcastAndObserveTransaction(
    txBuilder: ITransaction,
    transactionId = txBuilder.id
  ): Promise<TransactionBroadcastResult> {
    try {
      return await this.workerBeeSession.use(async (bot) => {
        logger.info('Broadcasting transaction id: %s', transactionId);
        logger.debug('Transaction %s body: %o', transactionId, txBuilder.toApi());

        // Broadcast and wait for block inclusion (irreversible with OBI)
        await bot.broadcast(txBuilder, { verifySignatures: true, expireInMs: 10_000 });

        return { transactionId };
      });
    } catch (caught) {
      const error = toObservedBroadcastError(
        caught,
        transactionId,
        (e) => e instanceof WorkerBeeError,
        transactionExpiration(txBuilder)
      );
      const operationNames = getOperationNames(txBuilder.transaction.operations).join(', ');
      if (error instanceof TransactionNotConfirmedError) {
        this.recordUnconfirmed(txBuilder, transactionId);
        logger.warn(
          '%s of %s sent but not confirmed in time, it may still apply: transaction %s',
          operationNames,
          this.signerOptions.username,
          error.transactionId
        );
      } else {
        logger.error(
          'Broadcasting %s of %s failed: %s',
          operationNames,
          this.signerOptions.username,
          error instanceof Error ? error.message : String(error)
        );
      }
      logger.debug('Broadcast error: %o', caught);
      throw error;
    }
  }

  /**
   * Broadcast transaction like `broadcastTransaction`, resolving after
   * sending it, with `included` reporting whether the session's bot saw
   * it in a block under its HF26 or legacy id. The bot watches from
   * before the broadcast, so the transaction cannot land in a block it
   * skipped. When the bot cannot be set up, the transaction is broadcast
   * without `included`. When `included` is false or rejects, the
   * transaction may still apply and is held as an unconfirmed broadcast.
   *
   * @param {ITransaction} txBuilder
   * @return {*}  {Promise<TransactionBroadcastResult>}
   * @memberof TransactionService
   */
  async broadcastAndConfirmInBackground(
    txBuilder: ITransaction,
    transactionId = txBuilder.id
  ): Promise<TransactionBroadcastResult> {
    let watch: IInclusionWatch | undefined;
    try {
      watch = await this.watchTransactionInclusion([txBuilder.id, txBuilder.legacy_id]);
    } catch (error) {
      logger.error(error, 'Cannot watch blocks for transaction %s', transactionId);
    }
    try {
      const result = await this.broadcastTransaction(txBuilder, transactionId);
      if (!watch) return result;
      const recordUnlessIncluded = (included: boolean) => {
        if (!included) this.recordUnconfirmed(txBuilder, transactionId);
      };
      watch.included.then(recordUnlessIncluded, () => recordUnlessIncluded(false));
      return { ...result, included: watch.included, expiration: transactionExpiration(txBuilder) };
    } catch (error) {
      watch?.cancel();
      throw error;
    }
  }

  /**
   * Holds a sent transaction that may still apply until its expiration, so a resend of it is refused,
   * and follows it until a block includes it or it expires, to tell the page.
   */
  private recordUnconfirmed(txBuilder: ITransaction, transactionId: string): void {
    const expiration = transactionExpiration(txBuilder);
    if (!expiration) return;
    this.unconfirmedBroadcasts.record({
      transactionId,
      transactionIds: [txBuilder.id, txBuilder.legacy_id],
      operations: serializedOperations(txBuilder),
      expiration
    });
  }

  /** Subscribes the session's bot to `transactionIds`, holding the bot until the watch settles. */
  private watchTransactionInclusion(transactionIds: readonly string[]): Promise<IInclusionWatch> {
    return new Promise((resolve, reject) => {
      this.workerBeeSession
        .use(async (bot) => {
          const watch = watchInclusion(bot, transactionIds, INCLUSION_TIMEOUT_MS, lookUpTransactionInclusion);
          resolve(watch);
          await watch.included;
        })
        // Before `resolve` this is a setup failure; after it, `watch.included` carries the error
        .catch(reject);
    });
  }

  async upVote(
    author: string,
    permlink: string,
    weight = 10000,
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.processHiveAppOperation((builder) => {
      builder.pushOperation({
        vote_operation: {
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
      builder.pushOperation({
        vote_operation: {
          voter: this.signerOptions.username,
          author,
          permlink,
          weight
        }
      });
    }, transactionOptions);
  }

  /** Broadcasts one community-plugin operation authorized by the signed-in account. */
  private broadcastCommunityOperation(
    build: (operation: CommunityOperation) => CommunityOperation,
    transactionOptions: TransactionOptions
  ) {
    return this.processHiveAppOperation((builder) => {
      builder.pushOperation(build(new CommunityOperation()).authorize(this.signerOptions.username));
    }, transactionOptions);
  }

  /** Broadcasts one follow-plugin operation the signed-in account performs and authorizes. */
  private broadcastFollowOperation(
    build: (operation: FollowOperation, account: string) => FollowOperation,
    transactionOptions: TransactionOptions
  ) {
    return this.processHiveAppOperation((builder) => {
      const account = this.signerOptions.username;
      builder.pushOperation(build(new FollowOperation(), account).authorize(account));
    }, transactionOptions);
  }

  /** Adds the comma-separated `otherBlogs` (and `blog`) to one of the account's follow lists. */
  private addToFollowList(
    list: 'muteBlog' | 'blacklistBlog' | 'followBlacklistBlog' | 'followMutedBlog',
    otherBlogs: string,
    blog: string,
    transactionOptions: TransactionOptions
  ) {
    return this.broadcastFollowOperation(
      (operation, account) => operation[list](account, blog, ...otherBlogs.split(', ')),
      transactionOptions
    );
  }

  private removeFromFollowList(
    list: 'unmuteBlog' | 'unblacklistBlog' | 'unfollowBlacklistBlog' | 'unfollowMutedBlog',
    blog: string,
    transactionOptions: TransactionOptions
  ) {
    return this.broadcastFollowOperation((operation, account) => operation[list](account, blog), transactionOptions);
  }

  private resetFollowList(list: FollowListReset, transactionOptions: TransactionOptions) {
    return this.broadcastFollowOperation(
      (operation, account) => buildFollowListReset(list, operation, account),
      transactionOptions
    );
  }

  async subscribe(community: string, transactionOptions: TransactionOptions = {}) {
    return await this.broadcastCommunityOperation((op) => op.subscribe(community), transactionOptions);
  }

  async unsubscribe(community: string, transactionOptions: TransactionOptions = {}) {
    return await this.broadcastCommunityOperation((op) => op.unsubscribe(community), transactionOptions);
  }

  async flag(
    community: string,
    username: string,
    permlink: string,
    notes: string,
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.broadcastCommunityOperation(
      (op) => op.flagPost(community, username, permlink, notes),
      transactionOptions
    );
  }

  async setRole(
    community: string,
    username: string,
    role: EAvailableCommunityRoles,
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.broadcastCommunityOperation((op) => op.setRole(community, username, role), transactionOptions);
  }

  async pin(community: string, username: string, permlink: string, transactionOptions: TransactionOptions = {}) {
    return await this.broadcastCommunityOperation((op) => op.pinPost(community, username, permlink), transactionOptions);
  }

  async unpin(community: string, username: string, permlink: string, transactionOptions: TransactionOptions = {}) {
    return await this.broadcastCommunityOperation(
      (op) => op.unpinPost(community, username, permlink),
      transactionOptions
    );
  }

  async mutePost(
    community: string,
    username: string,
    permlink: string,
    notes: string,
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.broadcastCommunityOperation(
      (op) => op.mutePost(community, username, permlink, notes),
      transactionOptions
    );
  }

  async unmutePost(
    community: string,
    username: string,
    permlink: string,
    notes: string,
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.broadcastCommunityOperation(
      (op) => op.unmutePost(community, username, permlink, notes),
      transactionOptions
    );
  }

  async setUserTitle(
    community: string,
    username: string,
    title: string,
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.broadcastCommunityOperation(
      (op) => op.setUserTitle(community, username, title),
      transactionOptions
    );
  }

  async reblog(username: string, permlink: string, transactionOptions: TransactionOptions = {}) {
    return await this.broadcastFollowOperation(
      (op, account) => op.reblog(account, username, permlink),
      transactionOptions
    );
  }

  async follow(username: string, transactionOptions: TransactionOptions = {}) {
    return await this.broadcastFollowOperation((op, account) => op.followBlog(account, username), transactionOptions);
  }

  async unfollow(username: string, transactionOptions: TransactionOptions = {}) {
    return await this.broadcastFollowOperation((op, account) => op.unfollowBlog(account, username), transactionOptions);
  }

  async mute(otherBlogs: string, blog = '', transactionOptions: TransactionOptions = {}) {
    return await this.addToFollowList('muteBlog', otherBlogs, blog, transactionOptions);
  }

  async unmute(blog: string, transactionOptions: TransactionOptions = {}) {
    return await this.removeFromFollowList('unmuteBlog', blog, transactionOptions);
  }

  async resetBlogList(transactionOptions: TransactionOptions = {}) {
    return await this.resetFollowList('muted', transactionOptions);
  }

  /** Unfollows every account the signed-in account follows (`reset_following_list`). */
  async resetFollowingBlog(transactionOptions: TransactionOptions = {}) {
    return await this.resetFollowList('following', transactionOptions);
  }

  async blacklistBlog(otherBlogs: string, blog = '', transactionOptions: TransactionOptions = {}) {
    return await this.addToFollowList('blacklistBlog', otherBlogs, blog, transactionOptions);
  }

  async unblacklistBlog(blog: string, transactionOptions: TransactionOptions = {}) {
    return await this.removeFromFollowList('unblacklistBlog', blog, transactionOptions);
  }

  async followBlacklistBlog(otherBlogs: string, blog = '', transactionOptions: TransactionOptions = {}) {
    return await this.addToFollowList('followBlacklistBlog', otherBlogs, blog, transactionOptions);
  }

  async unfollowBlacklistBlog(blog: string, transactionOptions: TransactionOptions = {}) {
    return await this.removeFromFollowList('unfollowBlacklistBlog', blog, transactionOptions);
  }

  async followMutedBlog(otherBlogs: string, blog = '', transactionOptions: TransactionOptions = {}) {
    return await this.addToFollowList('followMutedBlog', otherBlogs, blog, transactionOptions);
  }

  async resetBlacklistBlog(transactionOptions: TransactionOptions = {}) {
    return await this.resetFollowList('blacklist', transactionOptions);
  }

  async resetFollowBlacklistBlog(transactionOptions: TransactionOptions = {}) {
    return await this.resetFollowList('followBlacklist', transactionOptions);
  }

  async resetFollowMutedBlog(transactionOptions: TransactionOptions = {}) {
    return await this.resetFollowList('followMuted', transactionOptions);
  }

  async unfollowMutedBlog(blog: string, transactionOptions: TransactionOptions = {}) {
    return await this.removeFromFollowList('unfollowMutedBlog', blog, transactionOptions);
  }

  async comment(
    parentAuthor: string,
    parentPermlink: string,
    body: string,
    bodyMetadata: CommentBodyMetadata,
    preferences: Preferences,
    transactionOptions: TransactionOptions = {}
  ) {
    const replyOperationData: IReplyData = {
      parentAuthor,
      parentPermlink,
      author: this.signerOptions.username,
      body,
      permlink: `re-${parentAuthor.replaceAll('.', '-')}-${Date.now()}`,
      jsonMetadata: buildCommentJsonMetadata(bodyMetadata)
    };

    if (preferences.comment_rewards === '100%') {
      replyOperationData.percentHbd = 0;
    }
    if (preferences.comment_rewards === '50%' || preferences.comment_rewards === '0%') {
      replyOperationData.percentHbd = 10000;
    }
    if (preferences.comment_rewards === '0%') {
      replyOperationData.maxAcceptedPayout = await createAsset('0', 'HBD');
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
    bodyMetadata: CommentBodyMetadata,
    currentJsonMetadata: unknown,
    transactionOptions: TransactionOptions = {}
  ) {
    const reply = new ReplyOperation({
      parentAuthor,
      parentPermlink,
      author: this.signerOptions.username,
      body,
      jsonMetadata: buildCommentJsonMetadata(bodyMetadata, currentJsonMetadata),
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
    percentHbd: number,
    image?: string,
    transactionOptions: TransactionOptions = {}
  ) {
    const blogPost = new BlogPostOperation({
      category: getPostCategory(category, tags),
      beneficiaries,
      maxAcceptedPayout,
      percentHbd,
      tags,
      author: this.signerOptions.username,
      title,
      body,
      permlink,
      alternativeAuthor: altAuthor,
      images: [image ? image : ''],
      jsonMetadata: {
        summary,
        app: PUBLISHING_APP
      }
    });
    return await this.processHiveAppOperation((builder) => {
      builder.pushOperation(blogPost);
    }, transactionOptions);
  }
  async updatePost(
    permlink: string,
    title: string,
    body: string,
    tags: string[],
    category: string,
    summary: string,
    altAuthor: string,
    image?: string,
    transactionOptions: TransactionOptions = {}
  ) {
    const blogPost = new BlogPostOperation({
      category: getPostCategory(category, tags),
      tags,
      author: this.signerOptions.username,
      title,
      body,
      permlink,
      alternativeAuthor: altAuthor,
      images: [image ? image : ''],
      jsonMetadata: {
        summary,
        app: PUBLISHING_APP
      }
    });

    return await this.processHiveAppOperation((builder) => {
      builder.pushOperation(blogPost);
    }, transactionOptions);
  }

  /**
   * Update comment/post options (payout settings).
   * Can only make settings MORE restrictive (lower max_accepted_payout, lower percent_hbd).
   * Must be called before payout.
   */
  async updatePostOptions(
    permlink: string,
    maxAcceptedPayout: NaiAsset,
    percentHbd: number,
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.processHiveAppOperation((builder) => {
      builder.pushOperation({
        comment_options_operation: {
          author: this.signerOptions.username,
          permlink,
          max_accepted_payout: maxAcceptedPayout,
          percent_hbd: percentHbd,
          allow_votes: true,
          allow_curation_rewards: true,
          extensions: []
        }
      });
    }, transactionOptions);
  }

  async updateWalletProfile(
    username: string,
    memo_key: string,
    json_metadata: string,
    owner: Authorizes | undefined,
    active: Authorizes | undefined,
    posting: Authorizes | undefined,
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.processHiveAppOperation((builder) => {
      builder.pushOperation({
        account_update_operation: {
          account: username,
          memo_key: memo_key,
          json_metadata: json_metadata,
          owner: owner,
          active: active,
          posting: posting
        }
      });
    }, transactionOptions);
  }

  async updateAuthority(
    operations: AccountAuthorityUpdateOperation,
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.processHiveAppOperation((builder) => {
      builder.pushOperation(operations);
    }, transactionOptions);
  }

  /**
   * Broadcasts `account_update2` with the profile merged into the account's current
   * `posting_json_metadata`, so keys other frontends set survive the save.
   */
  async updateProfile(profile: ProfileMetadataUpdate, transactionOptions: TransactionOptions = {}) {
    const { username } = this.signerOptions;
    const { accounts } = await getFindAccounts(username);
    const account = accounts[0];
    if (!account) throw new Error(`Account ${username} not found`);
    const postingJsonMetadata = mergePostingJsonMetadata(account.posting_json_metadata, profile);
    return await this.processHiveAppOperation((builder) => {
      builder.pushOperation({
        account_update2_operation: {
          account: username,
          extensions: [],
          json_metadata: '',
          posting_json_metadata: postingJsonMetadata
        }
      });
    }, transactionOptions);
  }

  async deleteComment(permlink: string, transactionOptions: TransactionOptions = {}) {
    return await this.processHiveAppOperation((builder) => {
      builder.pushOperation({
        delete_comment_operation: {
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
      builder.pushOperation({
        update_proposal_votes_operation: {
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
      builder.pushOperation({
        custom_json_operation: {
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
        claim_reward_balance_operation: {
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
        account_witness_vote_operation: {
          account,
          witness,
          approve
        }
      });
    }, transactionOptions);
  }

  async witnessProxy(proxy: string, transactionOptions: TransactionOptions = {}) {
    return await this.processHiveAppOperation((builder) => {
      builder.pushOperation({
        account_witness_proxy_operation: {
          account: this.signerOptions.username,
          proxy: proxy
        }
      });
    }, transactionOptions);
  }
  async transferToSavings(
    amount: IAsset,
    fromAccount: string,
    memo: string,
    toAccount: string,
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.processHiveAppOperation((builder) => {
      builder.pushOperation({
        transfer_to_savings_operation: {
          amount,
          from: fromAccount,
          memo,
          to: toAccount
        }
      });
    }, transactionOptions);
  }

  async transferFromSavings(
    amount: IAsset,
    fromAccount: string,
    memo: string,
    toAccount: string,
    requestId: number,
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.processHiveAppOperation((builder) => {
      builder.pushOperation({
        transfer_from_savings_operation: {
          amount,
          from: fromAccount,
          memo,
          to: toAccount,
          request_id: requestId
        }
      });
    }, transactionOptions);
  }

  async transfer(
    amount: IAsset,
    fromAccount: string,
    memo: string,
    toAccount: string,
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.processHiveAppOperation((builder) => {
      builder.pushOperation({
        transfer_operation: {
          amount,
          from: fromAccount,
          memo,
          to: toAccount
        }
      });
    }, transactionOptions);
  }

  async transferToVesting(
    amount: IAsset,
    fromAccount: string,
    toAccount: string,
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.processHiveAppOperation((builder) => {
      builder.pushOperation({
        transfer_to_vesting_operation: {
          amount,
          from: fromAccount,
          to: toAccount
        }
      });
    }, transactionOptions);
  }

  async withdrawFromVesting(account: string, hp: IAsset, transactionOptions: TransactionOptions = {}) {
    const { total_vesting_fund_hive, total_vesting_shares } = await this.getDynamicGlobalProperties();
    const vestingShares = (await this.getChain()).hpToVests(
      hp,
      total_vesting_fund_hive,
      total_vesting_shares
    );

    return await this.processHiveAppOperation((builder) => {
      builder.pushOperation({
        withdraw_vesting_operation: {
          account,
          vesting_shares: vestingShares
        }
      });
    }, transactionOptions);
  }

  async delegateVestingShares(
    delegator: string,
    delegatee: string,
    hp: IAsset,
    transactionOptions: TransactionOptions = {}
  ) {
    const { total_vesting_fund_hive, total_vesting_shares } = await this.getDynamicGlobalProperties();
    const vestingShares = (await this.getChain()).hpToVests(
      hp,
      total_vesting_fund_hive,
      total_vesting_shares
    );
    return await this.processHiveAppOperation((builder) => {
      builder.pushOperation({
        delegate_vesting_shares_operation: {
          delegator,
          delegatee,
          vesting_shares: vestingShares
        }
      });
    }, transactionOptions);
  }

  async changeMasterPassword(
    account: string,
    keys: Record<'owner' | 'active' | 'posting', { old: string; new: string }>,
    transactionOptions: TransactionOptions
  ) {
    try {
      const accountAuthorityUpdateOp = await AccountAuthorityUpdateOperation.createFor(
        await getChain(),
        account
      );

      if (!keys.owner || !keys.active || !keys.posting) {
        throw new Error('Missing required keys for master password change');
      }

      const { owner, active, posting } = keys;

      if (
        !accountAuthorityUpdateOp.role('owner').has(owner.old) ||
        !accountAuthorityUpdateOp.role('active').has(active.old) ||
        !accountAuthorityUpdateOp.role('posting').has(posting.old)
      ) {
        throw new Error('Wrong master password');
      }

      accountAuthorityUpdateOp.role('owner').replace(owner.old, 1, owner.new);
      accountAuthorityUpdateOp.role('active').replace(active.old, 1, active.new);
      accountAuthorityUpdateOp.role('posting').replace(posting.old, 1, posting.new);

      return await this.processHiveAppOperation(async (builder) => {
        builder.pushOperation(accountAuthorityUpdateOp);
      }, transactionOptions);
    } catch (error) {
      const isKeyError = error instanceof Error && error.message.includes('import key');

      if (isKeyError) {
        throw new Error('One time signing failed, invalid key.');
      }

      throw new Error(`One time signing failed: ${(error as Error)?.message || 'Unknown error'}`);
    }
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
        create_claimed_account_operation: {
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
    memo_key: string,
    new_account_name: string,
    creator: string,
    json_metadata: string,
    active?: authority,
    owner?: authority,
    posting?: authority,
    transactionOptions: TransactionOptions = {}
  ) {
    const { median_props } = await (
      await getChain()
    ).api.database_api.get_witness_schedule({});

    // Transform NAI format to amount string
    const feeAmount = (
      parseInt(median_props.account_creation_fee.amount) /
      Math.pow(10, median_props.account_creation_fee.precision)
    ).toString();
    const fee = await getAsset(feeAmount, 'HIVE');
    return await this.processHiveAppOperation((builder) => {
      builder.pushOperation({
        account_create_operation: {
          fee,
          active,
          owner,
          posting,
          creator,
          memo_key,
          new_account_name,
          json_metadata
        }
      });
    }, transactionOptions);
  }

  async newCommunityUpdate(
    communityTag: string,
    title: string,
    about: string,
    creator: string,
    lang: ESupportedLanguages,
    is_nsfw: boolean,
    flag_text: string,
    description: string,
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.processHiveAppOperation(async (builder) => {
      builder.pushOperation(
        new CommunityOperation()
          .updateProps(communityTag, { title, about, is_nsfw, lang, description, flag_text })
          .setRole(communityTag, creator, EAvailableCommunityRoles.ADMIN)
          .authorize(communityTag)
          .subscribe(communityTag)
          .authorize(creator)
      );
    }, transactionOptions);
  }

  async updateCommunityProps(
    communityName: string,
    title: string,
    about: string,
    is_nsfw: boolean,
    lang: ESupportedLanguages,
    flag_text: string,
    description: string,
    admin: string,
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.processHiveAppOperation(async (builder) => {
      builder.pushOperation(
        new CommunityOperation()
          .updateProps(communityName, { title, about, is_nsfw, lang, flag_text, description })
          .authorize(admin)
      );
    }, transactionOptions);
  }

  async limitOrderCreate(
    amountToSell: IAsset,
    owner: string,
    minToReceive: IAsset,
    orderId: number,
    fillOrKill: boolean,
    expiration: string,
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.processHiveAppOperation((builder) => {
      builder.pushOperation({
        limit_order_create_operation: {
          amount_to_sell: amountToSell,
          owner,
          min_to_receive: minToReceive,
          fill_or_kill: fillOrKill,
          orderid: orderId,
          expiration
        }
      });
    }, transactionOptions);
  }

  async limitOrderCancel(owner: string, orderId: number, transactionOptions: TransactionOptions = {}) {
    return await this.processHiveAppOperation((builder) => {
      builder.pushOperation({
        limit_order_cancel_operation: {
          owner,
          orderid: orderId
        }
      });
    }, transactionOptions);
  }

  async cancelTransferFromSavings(
    fromAccount: string,
    requestId: number,
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.processHiveAppOperation((builder) => {
      builder.pushOperation({
        cancel_transfer_from_savings_operation: {
          from: fromAccount,
          request_id: requestId
        }
      });
    }, transactionOptions);
  }

  async delegateRC(
    fromAccount: string,
    amount: string,
    toAccount: string,
    transactionOptions: TransactionOptions = {}
  ) {
    return await this.processHiveAppOperation((builder) => {
      builder.pushOperation(
        new ResourceCreditsOperation().delegate(fromAccount, amount, toAccount).authorize(fromAccount)
      );
    }, transactionOptions);
  }
  async undelegateRC(fromAccount: string, toAccount: string, transactionOptions: TransactionOptions = {}) {
    return await this.processHiveAppOperation((builder) => {
      builder.pushOperation(
        new ResourceCreditsOperation().removeDelegation(fromAccount, toAccount).authorize(fromAccount)
      );
    }, transactionOptions);
  }
}
export const transactionService = new TransactionService();
subscribeToSignerOptions((signerOptions) => transactionService.setSignerOptions(signerOptions));

export { isHiveAccountNameValid } from './lib/validate-hive-account';

// Validation utilities
export * from './lib/validation';
