import { transactionService } from '@transaction/lib/lazy-transaction-service';
import { getLogger } from '@ui/lib/logging';
import { OBSERVE } from '@ui/components/hooks/use-operation-mutation';
import type { PostParams } from './optimistic-post';

const logger = getLogger('app');

// Observed broadcasts: the draft is not deleted until the transaction is confirmed on-chain.
export async function broadcastPost(params: PostParams) {
  const { permlink, title, body, beneficiaries, maxAcceptedPayout, tags, category } = params;
  const { summary, altAuthor, percentHbd, image, editMode } = params;
  if (!editMode) {
    if (!maxAcceptedPayout) throw new Error('maxAcceptedPayout is required for new posts');
    return transactionService.post(
      permlink,
      title,
      body,
      beneficiaries,
      maxAcceptedPayout,
      tags,
      category,
      summary,
      altAuthor,
      percentHbd,
      image,
      OBSERVE
    );
  }
  const broadcastResult = await transactionService.updatePost(
    permlink,
    title,
    body,
    tags,
    category,
    summary,
    altAuthor,
    image,
    OBSERVE
  );
  // Reward options changed (made more restrictive): broadcast comment_options as well
  if (maxAcceptedPayout && params.rewardOptionsChanged) {
    const optionsResult = await transactionService.updatePostOptions(
      permlink,
      maxAcceptedPayout,
      percentHbd,
      OBSERVE
    );
    logger.info('Post options update broadcast successful: %o', { permlink, optionsResult });
  }
  return broadcastResult;
}
