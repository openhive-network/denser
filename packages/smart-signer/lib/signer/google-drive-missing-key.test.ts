import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { WaxExternalSignatureProviderError } from '@hiveio/wax-signers-external';
import { missingKeyDialogProps } from './google-drive-missing-key.ts';

describe('missingKeyDialogProps', () => {
  it('names the missing role when the wallet holds other keys of the account', () => {
    const error = new WaxExternalSignatureProviderError(
      'No key found for account role: guest4test1@active',
      undefined,
      'KEY_NOT_FOUND'
    );
    assert.deepEqual(missingKeyDialogProps(error, 'guest4test1', 'active'), {
      errorType: 'key_not_found',
      username: 'guest4test1',
      keyType: 'active'
    });
  });

  it('reports an account the wallet holds no keys for', () => {
    const error = new WaxExternalSignatureProviderError('No key found for account: guest4test1', undefined, 'KEY_NOT_FOUND');
    assert.deepEqual(missingKeyDialogProps(error, 'guest4test1', 'posting'), {
      errorType: 'account_not_found',
      username: 'guest4test1'
    });
  });

  it('leaves other wallet errors alone, so a locked wallet still asks for the password', () => {
    const error = new WaxExternalSignatureProviderError('Failed to decrypt storage', undefined, 'DECRYPTION_FAILED');
    assert.equal(missingKeyDialogProps(error, 'guest4test1', 'active'), null);
  });

  it('leaves a plain error carrying the same text alone', () => {
    const error = new Error('No key found for account role: guest4test1@active');
    assert.equal(missingKeyDialogProps(error, 'guest4test1', 'active'), null);
  });
});
