import { CommunityOperationBuilder, EFollowBlogAction, FollowOperationBuilder } from '@hive/wax/web';
import { Signer, vote } from './signer';
import { logger } from '@hive/ui/lib/logger';
import { toast } from '@hive/ui/components/hooks/use-toast';
import { User } from '@smart-signer/types/common';
import { comment } from '@hive/wax/web';
import { createPermlink } from './utils';
import { Entry } from '@ui/lib/bridge';

// TODO Check errors message for indexOf for particular method

class OperationService {
  static signer = new Signer();
  description = 'Transaction broadcast error';

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

      try {
        await OperationService.signer.broadcastTransaction({
          operation: { vote },
          loginType: user.loginType,
          username: user.username
        });
        e.target.classList.add('text-white');
        if (type === 'upvote') {
          e.target.classList.add('bg-red-600');
        }

        if (type === 'downvote') {
          e.target.classList.add('bg-gray-600');
        }
      } catch (e) {
        if (`${e}`.indexOf('Not implemented') >= 0) {
          this.description = 'Method not implemented for this login type.';
        }
        toast({
          description: this.description,
          variant: 'destructive'
        });
      }
    }
  }

  async subscribe(username: string, user: User | null, type: string) {
    if (user && user.isLoggedIn) {
      const customJsonOperations: any[] = [];
      const cob = new CommunityOperationBuilder();
      if (type === 'subscribe') {
        cob.subscribe(username).authorize(user.username).build().flushOperations(customJsonOperations);
      }

      if (type === 'unsubscribe') {
        cob.unsubscribe(username).authorize(user.username).build().flushOperations(customJsonOperations);
      }

      try {
        await OperationService.signer.broadcastTransaction({
          operation: customJsonOperations[0],
          loginType: user.loginType,
          username: user.username
        });
      } catch (e) {
        if (`${e}`.indexOf('Not implemented') >= 0) {
          this.description = 'Method not implemented for this login type.';
        }
        toast({
          description: this.description,
          variant: 'destructive'
        });
      }
    }
  }

  async follow(username: string, user: User | null, type: string) {
    if (user && user.isLoggedIn) {
      const customJsonOperations: any[] = [];
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

      try {
        await OperationService.signer.broadcastTransaction({
          operation: customJsonOperations[0],
          loginType: user.loginType,
          username: user.username
        });
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
  }

  async reblog(username: string, user: User | null, permlink: string) {
    if (user && user.isLoggedIn) {
      const customJsonOperations: any[] = [];
      new FollowOperationBuilder()
        .reblog(user.username, username, permlink)
        .authorize(user.username)
        .build()
        .flushOperations(customJsonOperations);

      try {
        await OperationService.signer.broadcastTransaction({
          operation: customJsonOperations[0],
          loginType: user.loginType,
          username: user.username
        });
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
  }

  async flag(username: string, user: User | null, community: string, permlink: string, notes: string) {
    if (user && user.isLoggedIn) {
      const customJsonOperations: any[] = [];
      new CommunityOperationBuilder()
        .flagPost(community, username, permlink, notes)
        .authorize(user.username)
        .build()
        .flushOperations(customJsonOperations);

      try {
        await OperationService.signer.broadcastTransaction({
          operation: customJsonOperations[0],
          loginType: user.loginType,
          username: user.username
        });
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

      const signer = new Signer();
      try {
        await signer.broadcastTransaction({
          operation: { comment },
          loginType: user.loginType,
          username: user.username
        });
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
  }
}

export const operationService = new OperationService();
