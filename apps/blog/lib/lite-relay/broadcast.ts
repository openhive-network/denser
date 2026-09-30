import { ReplyOperation, type IReplyData } from '@hiveio/wax';
import { liteBridgeMarker, signDigest } from '@hive/lite-account';
import { getChain } from '@transaction/lib/chain';
import type { LiteRelayConfig } from './config';
import type { LiteReplyRequestInput } from './schema';

/**
 * Broadcast one L1 transaction, signed by the gate's posting key:
 *   comment_operation (json_metadata.lite_bridge = disavowal marker naming the attester)
 *   + custom_json lite_account [register_account]   (first post only)
 *   + custom_json lite_posts   [attest_post]
 * Atomic on L1: the comment and its attestation land together or not at all.
 */
export async function broadcastBridgedReply(
  req: LiteReplyRequestInput,
  permlink: string,
  cfg: LiteRelayConfig
): Promise<{ transactionId: string }> {
  const chain = await getChain();
  const tx = await chain.createTransaction();
  const reply: IReplyData = {
    parentAuthor: req.comment.parent_author,
    parentPermlink: req.comment.parent_permlink,
    author: cfg.gateAccount,
    permlink,
    title: req.comment.title,
    body: req.comment.body,
    jsonMetadata: { tags: req.comment.tags, lite_bridge: liteBridgeMarker(req.attester) }
  };
  tx.pushOperation(new ReplyOperation(reply));
  for (const l2 of [req.register_tx, req.attest_tx]) {
    if (!l2) continue;
    tx.pushOperation({
      custom_json_operation: {
        id: l2.app,
        json: JSON.stringify(l2),
        required_auths: [],
        required_posting_auths: [cfg.gateAccount]
      }
    });
  }
  tx.validate();
  tx.addSignature(signDigest(tx.sigDigest, cfg.gatePostingWif));
  await chain.api.network_broadcast_api.broadcast_transaction({ max_block_age: -1, trx: tx.toApiJson() });
  return { transactionId: tx.id };
}
