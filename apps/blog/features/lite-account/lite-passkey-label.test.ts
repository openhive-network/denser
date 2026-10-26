import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { AuthorityKeyMemberView, LiteAuthorityView } from '@hiveio/lite-account';

const { authenticatorLabel, authenticatorMeta, passkeyMembers } = await import('./lite-passkey-label.ts');

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

const ownedBy = (owner: AuthorityKeyMemberView[]): LiteAuthorityView => ({
  ok: true,
  name: 'brave-otter-4823',
  roles: { owner: { weight_threshold: 1, members: owner } },
  head_block_time: '2026-10-23T12:00:00'
});

describe('passkeyMembers', () => {
  it('lists the passkey and backup owner members with their labels, not other owner keys', () => {
    const owner = [
      key('STMbrowser'),
      key('STMroot', { meta: { kind: 'passkey', label: 'YubiKey 5 Series' } }),
      key('STMbackup', { meta: { kind: 'backup' }, active: false })
    ];
    assert.deepEqual(passkeyMembers(ownedBy(owner)), [
      { key: 'STMroot', kind: 'passkey', active: true, label: 'YubiKey 5 Series' },
      { key: 'STMbackup', kind: 'backup', active: false }
    ]);
  });
});

describe('authenticatorLabel', () => {
  const report = { attachment: 'platform', aaguid: null, name: null, description: 'this device' };

  it("is the model name when known, else the signer's description", () => {
    assert.equal(
      authenticatorLabel({ ...report, name: 'Google Password Manager' }),
      'Google Password Manager'
    );
    assert.equal(authenticatorLabel(report), 'this device');
  });

  it('is undefined without a report (an older signer), so the caller supplies its default', () => {
    assert.equal(authenticatorLabel(undefined), undefined);
    assert.equal(authenticatorLabel({ description: '' }), undefined);
  });
});

describe('authenticatorMeta', () => {
  it('keeps the known attachment, AAGUID and name, never the transports or description', () => {
    assert.deepEqual(
      authenticatorMeta({
        attachment: 'cross-platform',
        transports: ['usb', 'nfc'],
        aaguid: 'cb69481e-8ff7-4039-93ec-0a2729a154a8',
        name: null,
        description: 'YubiKey 5 Series'
      }),
      { attachment: 'cross-platform', aaguid: 'cb69481e-8ff7-4039-93ec-0a2729a154a8' }
    );
  });

  it('is undefined when nothing is known', () => {
    assert.equal(authenticatorMeta(undefined), undefined);
    assert.equal(authenticatorMeta({ attachment: null, description: 'a security key (USB)' }), undefined);
  });
});
