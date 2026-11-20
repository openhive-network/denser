import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// Node resolves neither the tsconfig path alias nor an extensionless import: point `@ui/…` at the
// package's TypeScript source and give the package's relative imports their `.ts`.
const UI_ALIAS = '@ui/';
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(UI_ALIAS)) {
      const source = new URL(`../../../../packages/ui/${specifier.slice(UI_ALIAS.length)}.ts`, import.meta.url);
      return nextResolve(source.href, context);
    }
    const inUi = context.parentURL?.includes('/packages/ui/');
    if (inUi && specifier.startsWith('./') && !specifier.endsWith('.ts')) return nextResolve(`${specifier}.ts`, context);
    return nextResolve(specifier, context);
  }
});

const { graduationAmount, graduationErrorKey, graduationOffer } = await import('./lite-graduation-state.ts');
const { relaysLink } = await import('./lite-authority-state.ts');

type View = Parameters<typeof graduationOffer>[0];
const view = (overrides: Partial<View> = {}): View => ({
  ok: true,
  name: 'brave-otter-482',
  eligible: false,
  reason: 'below_threshold',
  policy: 'rewards',
  rewards_hbd: 1.25,
  threshold_hbd: 3,
  linked_account: null,
  ...overrides
});

const info = (accountMethods?: string[]) => ({
  enabled: true as const,
  gate_account: 'test-gateway-4',
  chain_id: 'beeab0de',
  apps: { account: 'lite_account_test', posts: 'lite_posts_test' },
  limits: { l2: { apps: { lite_social_test: ['link'], ...(accountMethods ? { lite_account_test: accountMethods } : {}) } } }
});

describe('relaysLink', () => {
  it('is true only where the gateway relays link for its own account app', () => {
    assert.equal(relaysLink(info(['update_authority', 'link'])), true);
    assert.equal(relaysLink(info(['update_authority'])), false);
    assert.equal(relaysLink(info()), false);
    assert.equal(relaysLink({ enabled: false }), false);
    assert.equal(relaysLink(undefined), false);
  });
});

describe('graduationOffer', () => {
  it('offers the upgrade with the ledger amount and the threshold once eligible', () => {
    assert.deepEqual(graduationOffer(view({ eligible: true, reason: 'rewards_reached', rewards_hbd: 3.5 })), {
      kind: 'eligible',
      rewards: 3.5,
      threshold: 3
    });
    const allowlisted = view({ eligible: true, reason: 'allowlisted', policy: 'allowlist', threshold_hbd: null });
    assert.deepEqual(graduationOffer(allowlisted), { kind: 'eligible', rewards: 1.25, threshold: null });
  });

  it('shows how far along an account below the threshold is, never 100%', () => {
    assert.deepEqual(graduationOffer(view()), { kind: 'progress', rewards: 1.25, threshold: 3, percent: 41 });
    assert.equal(graduationOffer(view({ rewards_hbd: 0 })).kind, 'progress');
    const almost = graduationOffer(view({ rewards_hbd: 2.9999 }));
    assert.equal(almost.kind === 'progress' && almost.percent, 99);
  });

  it('names the linked account, and offers nothing without a threshold to progress to', () => {
    assert.deepEqual(graduationOffer(view({ linked_account: 'brave-otter', reason: 'already_linked' })), {
      kind: 'linked',
      account: 'brave-otter'
    });
    const notListed = view({ reason: 'not_allowlisted', policy: 'allowlist', threshold_hbd: null });
    assert.deepEqual(graduationOffer(notListed), { kind: 'none' });
  });
});

describe('graduationAmount', () => {
  const t = (key: string, options: Record<string, string | number>) => `${key} ${JSON.stringify(options)}`;

  it('shows the amounts with three decimals in the locale', () => {
    const progress = { kind: 'progress', rewards: 1.25, threshold: 1200, percent: 0 } as const;
    assert.equal(
      graduationAmount(t, progress, 'en'),
      'lite_account.graduation.progress {"rewards":"1.250","threshold":"1,200.000","percent":0}'
    );
    assert.equal(
      graduationAmount(t, { kind: 'eligible', rewards: 3, threshold: null }, 'pl'),
      'lite_account.graduation.earned {"rewards":"3,000"}'
    );
  });
});

describe('graduationErrorKey', () => {
  const coded = (code: string) => Object.assign(new Error(code), { code });

  it('names each graduation refusal by its code', () => {
    for (const code of ['not_eligible', 'name_taken', 'daily_cap', 'graduation_disabled', 'creator_balance', 'signer_keys']) {
      assert.equal(graduationErrorKey(coded(code)), `lite_account.graduation.errors.${code}`);
    }
  });

  it('says unavailable for anything else', () => {
    assert.equal(graduationErrorKey(coded('relay_unavailable')), 'lite_account.graduation.errors.unavailable');
    assert.equal(graduationErrorKey(new Error('boom')), 'lite_account.graduation.errors.unavailable');
    assert.equal(graduationErrorKey('boom'), 'lite_account.graduation.errors.unavailable');
  });
});
