import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { AuthorityKeyMemberView, LiteAuthorityView } from '@hiveio/lite-account';

const { deviceLabelGuess, passkeyRoot, postingDevices, relaysUpdateAuthority, securityWarning } =
  await import('./lite-authority-state.ts');

const NOW = Date.parse('2026-10-23T12:00:00Z');
const SIGNER = 'https://signer.syncad.com';

const key = (value: string, extra: Partial<AuthorityKeyMemberView> = {}): AuthorityKeyMemberView => ({
  type: 'secp256k1',
  value,
  weight: 1,
  expires: null,
  meta: null,
  effective_until: null,
  active: true,
  ...extra
});

const view = (
  owner: AuthorityKeyMemberView[],
  posting: AuthorityKeyMemberView[] = []
): LiteAuthorityView => ({
  ok: true,
  name: 'brave-otter-4823',
  roles: {
    owner: { weight_threshold: 1, members: owner },
    posting: { weight_threshold: 1, members: posting }
  },
  head_block_time: '2026-10-23T12:00:00'
});

describe('securityWarning', () => {
  it('is unsecured while no owner member is a passkey', () => {
    assert.equal(securityWarning(view([key('STMdevice')])), 'unsecured');
  });

  it('suggests a backup for a single passkey and no backup member', () => {
    assert.equal(
      securityWarning(view([key('STMroot', { meta: { kind: 'passkey', signer: SIGNER } })])),
      'add_backup'
    );
  });

  it('says nothing once a backup member is there', () => {
    const owner = [
      key('STMroot', { meta: { kind: 'passkey', signer: SIGNER } }),
      key('STMbackup', { meta: { kind: 'backup', signer: SIGNER } })
    ];
    assert.equal(securityWarning(view(owner)), null);
  });

  it('ignores inactive owner members', () => {
    assert.equal(
      securityWarning(view([key('STMroot', { meta: { kind: 'passkey' }, active: false })])),
      'unsecured'
    );
  });
});

describe('passkeyRoot', () => {
  it('is the passkey owner member and its signer, if recorded', () => {
    assert.deepEqual(passkeyRoot(view([key('STMroot', { meta: { kind: 'passkey', signer: SIGNER } })])), {
      key: 'STMroot',
      signer: SIGNER
    });
    assert.deepEqual(passkeyRoot(view([key('STMroot', { meta: { kind: 'passkey' } })])), { key: 'STMroot' });
    assert.equal(passkeyRoot(view([key('STMdevice')])), null);
  });
});

describe('postingDevices', () => {
  it('lists every posting member with its label, expiry and state, marking this browser', () => {
    const rows = postingDevices(
      view(
        [],
        [
          key('STMhere', {
            expires: '2026-10-28T12:00:00',
            effective_until: '2026-10-28T12:00:00',
            meta: { kind: 'device', label: 'Chrome · macOS' }
          }),
          key('STMthere', {
            expires: '2026-10-25T12:00:00',
            effective_until: '2026-10-25T12:00:00',
            meta: { kind: 'device', label: 'Firefox · Linux' }
          }),
          key('STMold', {
            expires: '2026-10-01T12:00:00',
            effective_until: '2026-10-01T12:00:00',
            active: false
          })
        ]
      ),
      'STMhere',
      NOW
    );
    assert.deepEqual(
      rows.map((row) => [row.key, row.label, row.current, row.renewable, row.active]),
      [
        ['STMhere', 'Chrome · macOS', true, true, true],
        ['STMthere', 'Firefox · Linux', false, false, true],
        ['STMold', undefined, false, false, false]
      ]
    );
  });

  it('offers Renew only within seven days of the expiry', () => {
    const row = (expires: string | null) =>
      postingDevices(view([], [key('STMhere', { expires })]), 'STMhere', NOW)[0];
    assert.equal(row('2026-10-30T11:00:00').renewable, true);
    assert.equal(row('2026-11-05T12:00:00').renewable, false);
    assert.equal(row(null).renewable, false);
  });
});

describe('relaysUpdateAuthority', () => {
  const info = (apps: Record<string, string[]> | undefined) => ({
    enabled: true as const,
    gate_account: 'test-gateway-1',
    chain_id: '0'.repeat(64),
    apps: { account: 'lite_account_test', posts: 'lite_posts_test' },
    limits: { l2: { apps } }
  });

  it('holds only when the gateway lists update_authority under its lite_account app', () => {
    assert.equal(
      relaysUpdateAuthority(info({ lite_account_test: ['update_authority'], lite_social_test: ['follow'] })),
      true
    );
    assert.equal(relaysUpdateAuthority(info({ lite_social_test: ['follow'] })), false);
    assert.equal(relaysUpdateAuthority(info({ lite_account: ['update_authority'] })), false);
    assert.equal(relaysUpdateAuthority(info(undefined)), false);
    assert.equal(relaysUpdateAuthority({ enabled: false }), false);
    assert.equal(relaysUpdateAuthority(undefined), false);
  });
});

describe('deviceLabelGuess', () => {
  it('names the browser and the system', () => {
    const mac =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
    const android =
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
    const firefox = 'Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0';
    const iphone =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
    assert.equal(deviceLabelGuess(mac), 'Chrome · macOS');
    assert.equal(deviceLabelGuess(android), 'Chrome · Android');
    assert.equal(deviceLabelGuess(firefox), 'Firefox · Linux');
    assert.equal(deviceLabelGuess(iphone), 'Safari · iOS');
    assert.equal(deviceLabelGuess('curl/8.0'), '');
  });
});
