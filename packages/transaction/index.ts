import {
  CommunityOperationBuilder,
  EFollowBlogAction,
  FollowOperationBuilder,
  operation,
  createHiveChain,
  BroadcastTransactionRequest
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

  async buildTransaction(operation: operation) {
    const hiveChain = await createHiveChain({ apiEndpoint: 'https://api.hive.blog' });
    const tx = await hiveChain.getTransactionBuilder();
    tx.push(operation).validate();
    logger.info('SignerHbauth.broadcastTransaction tx: %o', tx.toApi());
    const transaction = tx.build();
    // in here sign transaction via signer

    return { tx, transaction };
  }

  async brodcastTransaction(user: User, operation: operation) {
    try {
      const hiveChain = await createHiveChain({ apiEndpoint: 'https://api.hive.blog' });
      // In here we must build transaction via buildTransaction method, then sign with TransactionService.signer.sign or something like this and then broadcastTransaction
      const { tx, transaction } = await this.buildTransaction(operation);
      const signature = await TransactionService.signer.broadcastTransaction({
        tx: tx,
        loginType: user.loginType,
        username: user.username
      });
      transaction.signatures.push(signature);
      const transactionRequest = new BroadcastTransactionRequest(tx);
      await hiveChain.api.network_broadcast_api.broadcast_transaction(transactionRequest);
    } catch (e) {
      logger.error('got error', e);
      if (`${e}`.indexOf('Not implemented') >= 0) {
        this.description = 'Method not implemented for this login type.';
      }
      toast({
        description: this.description,
        variant: 'destructive'
      });
    }
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
