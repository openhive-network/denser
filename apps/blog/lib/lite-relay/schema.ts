import { z } from 'zod';

const l2OperationSchema = z.object({
  method: z.string().min(1).max(64),
  args: z.record(z.unknown())
});

export const l2TransactionSchema = z.object({
  app: z.string().min(1).max(32),
  version: z.literal(1),
  operations: z.array(l2OperationSchema).min(1).max(4),
  expiration: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/),
  nonce: z.string().max(128).optional(),
  signatures: z.array(z.string().regex(/^[0-9a-f]{130}$/)).max(4)
});

export const liteReplyRequestSchema = z.object({
  attester: z.string().regex(/^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])$/),
  comment: z.object({
    parent_author: z.string().min(1).max(16),
    parent_permlink: z.string().min(1).max(256),
    title: z.string().max(256),
    body: z.string().min(1),
    tags: z.array(z.string().max(64)).max(10)
  }),
  register_tx: l2TransactionSchema.optional(),
  attest_tx: l2TransactionSchema,
  client_id: z.string().max(128).optional()
});

export type LiteReplyRequestInput = z.infer<typeof liteReplyRequestSchema>;
export type L2TransactionInput = z.infer<typeof l2TransactionSchema>;
