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
import { getLogger } from '@hive/ui/lib/logging';
import { observer } from './lib/observer';

const logger = getLogger('app');

export type TransactionErrorCallback = undefined | ((error: any) => any)

export class TransactionService {
  errorDescription = 'Transaction broadcast error';
  signerOptions!: SignerOptions;
  wellKnownErrorDescriptions = [
    'Your current vote on this comment is identical to this vote',
    'Account does not have enough mana to downvote'
  ];

  setSignerOptions(signerOptions: SignerOptions) {
    this.signerOptions = signerOptions;
  }

  async processHiveAppOperation(
    cb: (opBuilder: ITransactionBuilder) => void,
    onError: TransactionErrorCallback = (error) => this.handleError(error),
    onTransactionSettled = () => {}
  ) {
    try {
      const txBuilder = await (await hiveChainService.getHiveChain()).getTransactionBuilder();
      cb(txBuilder);
      await this.processTransaction(txBuilder);
    } catch (error) {
      onError(error);
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

    const tx = txBuilder.build(signature);
    // create broadcast request
    const broadcastReq = new BroadcastTransactionRequest(txBuilder);

    // do broadcast
    await (
      await hiveChainService.getHiveChain()
    ).api.network_broadcast_api.broadcast_transaction(broadcastReq);
    await observer.start(signer.username);

    // Wait until resolved on blockchain
    await observer.observe(txBuilder);

    console.log('result got from observer');
  }

  async upVote(author: string, permlink: string, weight = 10000,
    onError: TransactionErrorCallback = undefined
  ) {
    await this.processHiveAppOperation(
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
      onError
    );
  }

  async downVote(author: string, permlink: string, weight = -10000,
    onError: TransactionErrorCallback = undefined
  ) {
    await this.processHiveAppOperation(
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
      onError
    );
  }

  async subscribe(
    username: string,
    onError: TransactionErrorCallback = undefined
  ) {
    await this.processHiveAppOperation(
      (builder) => {
        builder.push(
          new CommunityOperationBuilder()
            .subscribe(username)
            .authorize(this.signerOptions.username)
            .build()
        );
      },
      onError
    );
  }

  async unsubscribe(
    username: string,
    onError: TransactionErrorCallback = undefined
  ) {
    await this.processHiveAppOperation(
      (builder) => {
        builder.push(
          new CommunityOperationBuilder()
            .unsubscribe(username)
            .authorize(this.signerOptions.username)
            .build()
        );
      },
      onError
    );
  }

  async flag(
    community: string,
    username: string,
    permlink: string,
    notes: string,
    onError: TransactionErrorCallback = undefined
  ) {
    await this.processHiveAppOperation(
      (builder) => {
        builder.push(
          new CommunityOperationBuilder()
            .flagPost(community, username, permlink, notes)
            .authorize(this.signerOptions.username)
            .build()
        );
      }, onError
    );
  }

  async reblog(username: string, permlink: string,
    onError: TransactionErrorCallback = undefined
  ) {
    await this.processHiveAppOperation(
      (builder) => {
        builder.push(
          new FollowOperationBuilder()
            .reblog(this.signerOptions.username, username, permlink)
            .authorize(this.signerOptions.username)
            .build()
        );
      },
      onError
    );
  }

  async follow(username: string,
    onError: TransactionErrorCallback = undefined
  ) {
    await this.processHiveAppOperation(
      (builder) => {
        builder.push(
          new FollowOperationBuilder()
            .followBlog(this.signerOptions.username, username)
            .authorize(this.signerOptions.username)
            .build()
        );
      },
      onError
    );
  }

  async unfollow(username: string,
    onError: TransactionErrorCallback = undefined
  ) {
    await this.processHiveAppOperation(
      (builder) => {
        builder.push(
          new FollowOperationBuilder()
            .unfollowBlog(this.signerOptions.username, username)
            .authorize(this.signerOptions.username)
            .build()
        );
      },
      onError
    );
  }

  async mute(otherBlogs: string, blog = '',
    onError: TransactionErrorCallback = undefined
  ) {
    await this.processHiveAppOperation(
      (builder) => {
        builder.push(
          new FollowOperationBuilder()
            .muteBlog(this.signerOptions.username, blog, ...otherBlogs.split(', '))
            .authorize(this.signerOptions.username)
            .build()
        );
      },
      onError
    );
  }

  async unmute(blog: string,
    onError: TransactionErrorCallback = undefined
  ) {
    await this.processHiveAppOperation(
      (builder) => {
        builder.push(
          new FollowOperationBuilder()
            .unmuteBlog(this.signerOptions.username, blog)
            .authorize(this.signerOptions.username)
            .build()
        );
      },
      onError
    );
  }

  async resetBlogList(
    onError: TransactionErrorCallback = undefined
  ) {
    await this.processHiveAppOperation(
      (builder) => {
        builder.push(
          new FollowOperationBuilder()
            .resetBlogList(EFollowBlogAction.MUTE_BLOG, this.signerOptions.username, 'all')
            .authorize(this.signerOptions.username)
            .build()
        );
      },
      onError
    );
  }

  async blacklistBlog(otherBlogs: string, blog = '',
    onError: TransactionErrorCallback = undefined
  ) {
    await this.processHiveAppOperation(
      (builder) => {
        builder.push(
          new FollowOperationBuilder()
            .blacklistBlog(this.signerOptions.username, blog, ...otherBlogs.split(', '))
            .authorize(this.signerOptions.username)
            .build()
        );
      },
      onError
    );
  }

  async unblacklistBlog(blog: string,
    onError: TransactionErrorCallback = undefined
  ) {
    await this.processHiveAppOperation(
      (builder) => {
        builder.push(
          new FollowOperationBuilder()
            .unblacklistBlog(this.signerOptions.username, blog)
            .authorize(this.signerOptions.username)
            .build()
        );
      },
      onError
    );
  }

  async followBlacklistBlog(otherBlogs: string, blog = '',
    onError: TransactionErrorCallback = undefined
  ) {
    await this.processHiveAppOperation(
      (builder) => {
        builder.push(
          new FollowOperationBuilder()
            .followBlacklistBlog(this.signerOptions.username, blog, ...otherBlogs.split(', '))
            .authorize(this.signerOptions.username)
            .build()
        );
      },
      onError
    );
  }

  async unfollowBlacklistBlog(blog: string,
    onError: TransactionErrorCallback = undefined
  ) {
    await this.processHiveAppOperation(
      (builder) => {
        builder.push(
          new FollowOperationBuilder()
            .unfollowBlacklistBlog(this.signerOptions.username, blog)
            .authorize(this.signerOptions.username)
            .build()
        );
      },
      onError
    );
  }

  async followMutedBlog(otherBlogs: string, blog = '',
    onError: TransactionErrorCallback = undefined
  ) {
    await this.processHiveAppOperation(
      (builder) => {
        builder.push(
          new FollowOperationBuilder()
            .followMutedBlog(this.signerOptions.username, blog, ...otherBlogs.split(', '))
            .authorize(this.signerOptions.username)
            .build()
        );
      },
      onError
    );
  }

  async resetAllBlog(
    onError: TransactionErrorCallback = undefined
  ) {
    await this.processHiveAppOperation(
      (builder) => {
        builder.push(
          new FollowOperationBuilder()
            .resetAllBlog(this.signerOptions.username, 'all')
            .authorize(this.signerOptions.username)
            .build()
        );
      },
      onError
    );
  }

  async resetBlacklistBlog(
    onError: TransactionErrorCallback = undefined
  ) {
    await this.processHiveAppOperation(
      (builder) => {
        builder.push(
          new FollowOperationBuilder()
            .resetBlacklistBlog(this.signerOptions.username, 'all')
            .authorize(this.signerOptions.username)
            .build()
        );
      },
      onError
    );
  }

  async resetFollowBlacklistBlog(
    onError: TransactionErrorCallback = undefined
  ) {
    await this.processHiveAppOperation(
      (builder) => {
        builder.push(
          new FollowOperationBuilder()
            .resetFollowBlacklistBlog(this.signerOptions.username, 'all')
            .authorize(this.signerOptions.username)
            .build()
        );
      },
      onError
    );
  }

  async resetFollowMutedBlog(
    onError: TransactionErrorCallback = undefined
  ) {
    await this.processHiveAppOperation(
      (builder) => {
        builder.push(
          new FollowOperationBuilder()
            .resetFollowMutedBlog(this.signerOptions.username, 'all')
            .authorize(this.signerOptions.username)
            .build()
        );
      },
      onError
    );
  }

  async unfollowMutedBlog(blog: string,
    onError: TransactionErrorCallback = undefined
  ) {
    await this.processHiveAppOperation(
      (builder) => {
        builder.push(
          new FollowOperationBuilder()
            .unfollowMutedBlog(this.signerOptions.username, blog)
            .authorize(this.signerOptions.username)
            .build()
        );
      },
      onError
    );
  }

  async comment(
    parentAuthor: string,
    parentPermlink: string,
    body: string,
    preferences: Preferences,
    onError: TransactionErrorCallback = undefined
  ) {
    const chain = await hiveChainService.getHiveChain();
    await this.processHiveAppOperation(
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
      onError
    );
  }

  async updateComment(
    parentAuthor: string,
    parentPermlink: string,
    permlink: string,
    body: string,
    preferences: Preferences,
    onError: TransactionErrorCallback = undefined
  ) {
    const chain = await hiveChainService.getHiveChain();
    await this.processHiveAppOperation(
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
            body,
            {},
            permlink
          )
          .build();
      },
      onError
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
    payoutType: string,
    image?: string,
    onError: TransactionErrorCallback = undefined
  ) {
    const chain = await hiveChainService.getHiveChain();
    await this.processHiveAppOperation(
      (builder) => {
        builder
          .useBuilder(
            ArticleBuilder,
            (articleBuilder) => {
              articleBuilder
                .setCategory(category !== 'blog' ? category : tags[0])
                .setMaxAcceptedPayout(maxAcceptedPayout)
                .pushTags(...tags)
                .pushMetadataProperty({ summary: summary })
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

              beneficiaries.forEach((beneficiarie) => {
                articleBuilder.addBeneficiary(beneficiarie.account, Number(beneficiarie.weight));
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
      onError
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
    onError: TransactionErrorCallback = undefined
  ) {
    await this.processHiveAppOperation(
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
      onError
    );
  }

  async deleteComment(permlink: string,
    onError: TransactionErrorCallback = undefined
  ) {
    await this.processHiveAppOperation(
      (builder) => {
        builder.push({
          delete_comment: {
            author: this.signerOptions.username,
            permlink: permlink
          }
        });
      },
      onError
    );
  }

  async updateProposalVotes(
    proposal_ids: string[],
    approve: boolean,
    extensions: future_extensions[],
    onError: TransactionErrorCallback = undefined
  ) {
    await this.processHiveAppOperation(
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
      onError
    );
  }

  async markAllNotificationAsRead(
    date: string,
    onError: TransactionErrorCallback = undefined
  ) {
    await this.processHiveAppOperation(
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
      onError
    );
  }

  async claimRewards(
    account: ApiAccount,
    onError: TransactionErrorCallback = undefined
  ) {
    await this.processHiveAppOperation(
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
      onError
    );
  }

  handleError(e: any, toastOptions: Toast = {}) {
    logger.error('got error', e);
    const isError = (err: unknown): err is Error => err instanceof Error;
    const isWaxError = (err: unknown): err is WaxChainApiError => err instanceof WaxChainApiError;
    let description = 'Unknown error';
    if (isWaxError(e)) {
      const error = e as any;
      // this is temporary solution for "wait 5 minut after create another post" error
      if (error?.apiError?.code === -32003) {
        description = error?.apiError?.data?.stack[0]?.format;
        for (const wked of this.wellKnownErrorDescriptions) {
          if (description.includes(wked)) {
            description = wked;
            break;
          }
        }
      } else {
        description = error?.message ?? this.errorDescription;
        for (const wellKnownErrorDescription of this.wellKnownErrorDescriptions) {
          if (description.includes(wellKnownErrorDescription)) {
            description = wellKnownErrorDescription;
            break;
          }
        }
      }
    } else if (isError(e)) {
      description = e.message;
    } else if (typeof e === 'string') {
      description = e;
    }
    toast({
      description,
      variant: 'destructive',
      ...toastOptions
    });
  }
}

export const transactionService = new TransactionService();
