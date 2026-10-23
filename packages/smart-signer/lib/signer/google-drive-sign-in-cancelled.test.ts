import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isUserCancelled } from '../../../ui/lib/user-cancelled.ts';
import { GoogleDriveSignInCancelledError } from './google-drive-sign-in-cancelled.ts';

describe('GoogleDriveSignInCancelledError', () => {
  it("is taken for the user's own cancel, so it is logged once and shows no toast", () => {
    assert.equal(isUserCancelled(new GoogleDriveSignInCancelledError('key_not_found (User closed dialog)')), true);
  });

  it('keeps the reason in its message', () => {
    const error = new GoogleDriveSignInCancelledError('wallet_not_found (User went to Hive Bridge)');
    assert.equal(error.name, 'GoogleDriveSignInCancelledError');
    assert.match(error.message, /wallet_not_found \(User went to Hive Bridge\)/);
  });
});
