import { stubAccountWith } from './walletApiStub';

/**
 * A master password of no real account, and the keys it derives for STUB_ACCOUNT
 * (`getPrivateKeyFromPassword('gtg', role, STUB_MASTER_PASSWORD)`), for the specs of the account-key
 * pages: permissions, password and authorities.
 */
export const STUB_MASTER_PASSWORD = 'P5denserFixtureMasterPassword';

export const STUB_KEYS = {
  owner: {
    wif: '5KkefAt26HGzt9ymHkMTtWwGPFxJCqxEe4w1az5NS9KCBXNNcbb',
    publicKey: 'STM7fapjXfD76Dm2R7HVzrN8vfuqgPUAtRQ6rtvzBFsPm5jd6cXfi'
  },
  active: {
    wif: '5JRJLxLBaSiANoqzadz8hA6MaGGHXhWWBEokKdR2SWGJujvdhsx',
    publicKey: 'STM71FYmCuThNqVhJTrHYigUEEd3TbKdGpTbov3fJBgr4SC3wFKRd'
  },
  posting: {
    wif: '5JvKJ4jWG5W63zSbubhK4PNkjTawPKNJ4GjS68DraJp82Q8WV4y',
    publicKey: 'STM4zDCXGjxGXdK59DybCVnjb9NZ2NmnFUU6ZquBEbornHqwWd8f6'
  },
  memo: {
    wif: '5KHbpSVimgriNuEE26Y4sjQCJzwcz7jgnTSLZwzBbWoQxZuQUxT',
    publicKey: 'STM56fS83SJLL3KpfHohiiUtXNZrxcDbVKxmpjTsA8bKQmoaGQeRh'
  }
} as const;

/** The recovery account STUB_ACCOUNT names */
export const STUB_RECOVERY_ACCOUNT = 'stub-recovery';

/** Another account: signed in as it, STUB_ACCOUNT's pages are someone else's */
export const OTHER_ACCOUNT = 'stub-other';

const authority = (publicKey: string) => ({ weight_threshold: 1, account_auths: [], key_auths: [[publicKey, 1]] });

/** `startWalletApiStub`'s `jsonRpc` giving STUB_ACCOUNT the keys STUB_MASTER_PASSWORD derives. */
export const stubAccountKeys = () =>
  stubAccountWith({
    owner: authority(STUB_KEYS.owner.publicKey),
    active: authority(STUB_KEYS.active.publicKey),
    posting: authority(STUB_KEYS.posting.publicKey),
    memo_key: STUB_KEYS.memo.publicKey,
    recovery_account: STUB_RECOVERY_ACCOUNT
  });
