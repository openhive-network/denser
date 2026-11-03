import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// Under node's type stripping the aliases do not resolve, nor does the pino logger load: stand in a
// silent logger, and a chain the tests set through `chain.current`
const CHAIN_MODULE =
  'data:text/javascript,export const chain = { current: null }; export const getChain = async () => chain.current;';
const MODULES: Record<string, string> = {
  '@hive/common-hiveio-packages': CHAIN_MODULE,
  '@ui/lib/logging': 'data:text/javascript,export const getLogger = () => ({ error: () => {} });',
  '@smart-signer/lib/validators/key-role': new URL('./key-role.ts', import.meta.url).href,
  '@smart-signer/lib/validators/key-role-hint': new URL('./key-role-hint.ts', import.meta.url).href
};
registerHooks({
  resolve(specifier, context, nextResolve) {
    const module = MODULES[specifier];
    if (module !== undefined) return { url: module, shortCircuit: true };
    return nextResolve(specifier, context);
  }
});

const { chain } = await import(CHAIN_MODULE);
const { describeRefusedKey, validateKeyAuthority, validateSafeStorageKey } = await import(
  './validate-key-authority.ts'
);

const ACCOUNT = 'guest4test2';
const AUTHORISED = 'guest4test1';
const UNRELATED = 'guest4test3';
const ACTIVE_KEY = 'STM7ActiveKeyOfTheStubAccount';
const POSTING_KEY = 'STM6PostingKeyOfTheStubAccount';
const OTHER_KEY = 'STM5KeyOfAnotherAccount';
const WIF = '5Jg6Um6AvJZ886UWQnNBfqScNo9f8PtGWecXo7gZS29FoVgektM';
const ACTIVE_HINT = 'login_form.zod_error.key_without_active_authority';

const authority = (keys: string[], accounts: string[] = []) => ({
  weight_threshold: 1,
  account_auths: accounts.map((name): [string, number] => [name, 1]),
  key_auths: keys.map((key): [string, number] => [key, 1])
});

const ACCOUNT_AUTHORITIES = {
  name: ACCOUNT,
  owner: authority(['STM8OwnerKeyOfTheStubAccount']),
  active: authority([ACTIVE_KEY], [AUTHORISED]),
  posting: authority([POSTING_KEY])
};

const OTHER_POSTING_KEY = 'STM4PostingKeyOfAnotherAccount';

/** An account other than ACCOUNT, whose active key is OTHER_KEY and posting key OTHER_POSTING_KEY */
const holderAuthorities = (name: string) => ({
  name,
  owner: authority(['STM3OwnerKeyOfAnotherAccount']),
  active: authority([OTHER_KEY]),
  posting: authority([OTHER_POSTING_KEY])
});

let holderLookups = 0;
let holderAccountsUnreadable = false;

/** A chain where WIF's public key is `publicKey`, held by `holders`; the holder lookup fails for `holders` null */
function useChain(publicKey: string, holders: string[] | null = []): void {
  chain.current = {
    calculatePublicKey: () => publicKey,
    api: {
      database_api: {
        find_accounts: async ({ accounts }: { accounts: string[] }) => {
          if (accounts.includes(ACCOUNT)) return { accounts: [ACCOUNT_AUTHORITIES] };
          if (holderAccountsUnreadable) throw new Error('Unable to acquire database lock');
          return { accounts: accounts.map(holderAuthorities) };
        }
      },
      account_by_key_api: {
        get_key_references: async () => {
          holderLookups += 1;
          if (!holders) throw new Error('Unable to acquire database lock');
          return { accounts: [holders] };
        }
      }
    }
  };
}

beforeEach(() => {
  holderLookups = 0;
  holderAccountsUnreadable = false;
});

describe('validateSafeStorageKey', () => {
  it("refuses the account's own key of another role, without looking up its holders", async () => {
    useChain(POSTING_KEY, [UNRELATED]);
    assert.deepEqual(await validateSafeStorageKey(ACCOUNT, 'active', WIF, true), { key: ACTIVE_HINT });
    assert.equal(holderLookups, 0);
  });

  it("accepts the account's own key of the role asked for, without looking up its holders", async () => {
    useChain(ACTIVE_KEY, [UNRELATED]);
    assert.equal(await validateSafeStorageKey(ACCOUNT, 'active', WIF, true), null);
    assert.equal(holderLookups, 0);
  });

  it("names an authorised account's key in Direct Authority Mode", async () => {
    useChain(OTHER_KEY, [AUTHORISED]);
    assert.deepEqual(await validateSafeStorageKey(ACCOUNT, 'active', WIF, true), {
      key: 'login_form.zod_error.authorised_account_active_key',
      values: { owner: AUTHORISED, account: ACCOUNT }
    });
  });

  it("names an authorised account's key of another role as that account's, in Direct Authority Mode", async () => {
    useChain(OTHER_POSTING_KEY, [AUTHORISED]);
    assert.deepEqual(await validateSafeStorageKey(ACCOUNT, 'active', WIF, true), {
      key: 'login_form.zod_error.other_account_active_key',
      values: { owner: AUTHORISED, account: ACCOUNT }
    });
  });

  it("leaves the key to safe storage when its holders' authorities cannot be read", async () => {
    useChain(OTHER_KEY, [AUTHORISED]);
    holderAccountsUnreadable = true;
    assert.equal(await validateSafeStorageKey(ACCOUNT, 'active', WIF, true), null);
  });

  it("names an unrelated account's key in Direct Authority Mode", async () => {
    useChain(OTHER_KEY, [UNRELATED]);
    assert.deepEqual(await validateSafeStorageKey(ACCOUNT, 'active', WIF, true), {
      key: 'login_form.zod_error.other_account_active_key',
      values: { owner: UNRELATED, account: ACCOUNT }
    });
  });

  it('leaves a key nobody is known to hold to safe storage', async () => {
    useChain(OTHER_KEY, []);
    assert.equal(await validateSafeStorageKey(ACCOUNT, 'active', WIF, true), null);
  });

  it('leaves the key to safe storage when its holders cannot be read', async () => {
    useChain(OTHER_KEY, null);
    assert.equal(await validateSafeStorageKey(ACCOUNT, 'active', WIF, true), null);
    assert.equal(holderLookups, 1);
  });

  it("leaves another account's key to safe storage with Direct Authority Mode off", async () => {
    useChain(OTHER_KEY, [UNRELATED]);
    assert.equal(await validateSafeStorageKey(ACCOUNT, 'active', WIF, false), null);
    assert.equal(holderLookups, 0);
  });
});

describe('describeRefusedKey', () => {
  it("names an unrelated account's refused key", async () => {
    useChain(OTHER_KEY, [UNRELATED]);
    assert.deepEqual(await describeRefusedKey(ACCOUNT, 'active', WIF, false, ACTIVE_HINT), {
      key: 'login_form.zod_error.other_account_active_key',
      values: { owner: UNRELATED, account: ACCOUNT }
    });
  });

  it("names an authorised account's key refused in Direct Authority Mode", async () => {
    useChain(OTHER_KEY, [AUTHORISED]);
    assert.equal(
      (await describeRefusedKey(ACCOUNT, 'active', WIF, true, ACTIVE_HINT)).key,
      'login_form.zod_error.authorised_account_active_key'
    );
  });

  it("gives the role hint for an authorised account's key refused with the mode off", async () => {
    useChain(OTHER_KEY, [AUTHORISED]);
    assert.deepEqual(await describeRefusedKey(ACCOUNT, 'active', WIF, false, ACTIVE_HINT), {
      key: ACTIVE_HINT
    });
  });

  it('gives the role hint for a key of no known holder', async () => {
    useChain(OTHER_KEY, []);
    assert.deepEqual(await describeRefusedKey(ACCOUNT, 'active', WIF, true, ACTIVE_HINT), {
      key: ACTIVE_HINT
    });
  });

  it('gives the role hint when the holders cannot be read', async () => {
    useChain(OTHER_KEY, null);
    assert.deepEqual(await describeRefusedKey(ACCOUNT, 'active', WIF, true, ACTIVE_HINT), {
      key: ACTIVE_HINT
    });
  });

  it("gives the role hint the refusal named for the account's own key", async () => {
    useChain(POSTING_KEY, []);
    const postingHint = 'login_form.zod_error.active_key_for_posting';
    assert.deepEqual(await describeRefusedKey(ACCOUNT, 'active', WIF, true, postingHint), {
      key: postingHint
    });
  });
});

describe('validateKeyAuthority', () => {
  it("refuses the account's own key of another role with the role hint", async () => {
    useChain(POSTING_KEY);
    assert.equal(await validateKeyAuthority(ACCOUNT, 'active', WIF), ACTIVE_HINT);
  });

  it("leaves another account's key to on-chain verification, without looking up its holders", async () => {
    useChain(OTHER_KEY, [UNRELATED]);
    assert.equal(await validateKeyAuthority(ACCOUNT, 'active', WIF), null);
    assert.equal(holderLookups, 0);
  });
});
