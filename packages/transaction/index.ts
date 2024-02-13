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
    const txBuilder = await (await this.getHiveChain()).getTransactionBuilder()

    // wait until callback 
    cb(txBuilder);
    
    await this.processTransaction(txBuilder.build().operations);
  }
  
  async processTransaction(ops: IHiveAppsOperation): Promise<void> {
    // main tx builder
    const txBuilder = await (await this.getHiveChain()).getTransactionBuilder()

    // push all specific ops to main tx builder
    txBuilder.push(ops);
    
    // validate
    txBuilder.validate();

    // Sign using smart-signer
    // pass to smart-signer txBuilder.sigDigest
    const signedTx = TransactionService.signer.signTransaction(txBuilder)

    // broadcast
    const broadcastReq = new BroadcastTransactionRequest(signedTx)
    await (await this.getHiveChain()).api.network_broadcast_api.broadcast_transaction(broadcastReq)

    // Return Result??
  }

  async vote(e: any, user: User | null, type: string, post: Entry) {
    if (user && user.isLoggedIn) {
      const vote: vote = {
        voter: user.username,
        author: post.author,
        permlink: post.permlink,
        weight: 10000
      };

      if (type === 'downvote') {
        vote.weight = -10000;
      }
      this.brodcastTransaction(user, { vote });
    }
  }

  async subscribe(username: string, user: User | null, type: string) {
    if (user && user.isLoggedIn) {
      const customJsonOperations: operation[] = [];
      const cob = new CommunityOperationBuilder();
      if (type === 'subscribe') {
        cob.subscribe(username).authorize(user.username).build().flushOperations(customJsonOperations);
      }

      if (type === 'unsubscribe') {
        cob.unsubscribe(username).authorize(user.username).build().flushOperations(customJsonOperations);
      }
      this.brodcastTransaction(user, customJsonOperations[0]);
    }
  }


  async follow(username: string, user: User | null, type: string) {
    if (user && user.isLoggedIn) {
      const customJsonOperations: operation[] = [];
      const fob = new FollowOperationBuilder();
      if (type === 'follow') {
        fob
          .followBlog(user.username, username)
          .authorize(user.username)
          .build()
          .flushOperations(customJsonOperations);
      }

      if (type === 'unfollow') {
        fob
          .resetBlogList(EFollowBlogAction.FOLLOW_BLOG, user.username, username) // This is for change because we pass what:["reset_following_list"], this is wrong we need to pass what: []
          .authorize(user.username)
          .build()
          .flushOperations(customJsonOperations);
      }

      if (type === 'mute') {
        fob
          .muteBlog(user.username, username)
          .authorize(user.username)
          .build()
          .flushOperations(customJsonOperations);
      }

      if (type === 'unmute') {
        fob
          .resetBlogList(EFollowBlogAction.BOTH, user.username, username)
          .authorize(user.username)
          .build()
          .flushOperations(customJsonOperations);
      }

      this.brodcastTransaction(user, customJsonOperations[0]);
    }
  }

  async reblog(username: string, user: User | null, permlink: string) {
    if (user && user.isLoggedIn) {
      const customJsonOperations: operation[] = [];
      new FollowOperationBuilder()
        .reblog(user.username, username, permlink)
        .authorize(user.username)
        .build()
        .flushOperations(customJsonOperations);

      this.brodcastTransaction(user, customJsonOperations[0]);
    }
  }

  async flag(username: string, user: User | null, community: string, permlink: string, notes: string) {
    if (user && user.isLoggedIn) {
      const customJsonOperations: operation[] = [];
      new CommunityOperationBuilder()
        .flagPost(community, username, permlink, notes)
        .authorize(user.username)
        .build()
        .flushOperations(customJsonOperations);

      this.brodcastTransaction(user, customJsonOperations[0]);
    }
  }

  async addComment(username: string, user: User | null, permlink: string, cleanedText: string) {
    if (user && user.isLoggedIn) {
      const comment: comment = {
        parent_author: username,
        parent_permlink: permlink,
        author: user.username,
        permlink: await createPermlink('', user.username, permlink),
        title: '',
        body: cleanedText,
        json_metadata: '{"app":"hiveblog/0.1"}'
      };

      this.brodcastTransaction(user, { comment });
    }
  }
}


export const transactionService = new TransactionService();
