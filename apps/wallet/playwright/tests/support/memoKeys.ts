/**
 * Generated MEMO key pairs of no real account, and a memo encrypted between them, for the memo
 * encryption specs: `getPrivateKeyFromPassword(account, 'memo', password)`, with the passwords
 * `denser-fixture-memo-key` (STUB_ACCOUNT) and `denser-fixture-sender-memo-key` (the sender).
 */

export const RECIPIENT_MEMO_WIF = '5J1DMxmJAfPR2qvQoNEuUCAXNjfVQVLbNGe5ofQ7VkBCbydQWrg';
export const RECIPIENT_MEMO_PUBLIC_KEY = 'STM6F7rvuwHGe2Goj2veXDeyNS5PKwBE1AtQYLK94Ds2MULXEuLPv';
export const SENDER_MEMO_WIF = '5JPHhxDdBo6aFU8GuGzpPE85FaNmndTKFFb1eiZMp35k8sNd5cw';

export const PLAINTEXT_MEMO = '#hello from stub-sender';
/** PLAINTEXT_MEMO encrypted with SENDER_MEMO_WIF for RECIPIENT_MEMO_PUBLIC_KEY (the `#` is not encrypted). */
export const ENCRYPTED_MEMO =
  '#8j3XSecWPyvLkxjZAqwphMHxGJFTaCpSDxP5diw5cP8aKWMTe7a5Dq6DyRJjggr9XAqGQ9VwYpQmTv2nTopNtbzWCxN5miQJVuu8sQB5NjsX8usFgWa8Y8UBSND3irWjVRiwpzwEfVbCVeEaPcnzmKU';

/** `#` and base58: what an encrypted memo looks like on the chain. */
export const ENCRYPTED_MEMO_SHAPE = /^#[1-9A-HJ-NP-Za-km-z]+$/;
