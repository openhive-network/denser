import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_METAMASK_SNAP_VERSION,
  ensureSnapVersion,
  isSnapVersionOlder,
  OutdatedMetaMaskSnapError,
  requiredSnapVersion,
  snapWritesStandardMemoLayout
} from './metamask-snap-version.ts';

describe('metamask-snap-version: comparing versions', () => {
  it('orders by major, then minor, then patch', () => {
    assert.equal(isSnapVersionOlder('1.7.0', '1.8.0'), true);
    assert.equal(isSnapVersionOlder('1.8.0', '1.8.0'), false);
    assert.equal(isSnapVersionOlder('1.10.0', '1.8.0'), false);
    assert.equal(isSnapVersionOlder('1.8.0', '1.8.1'), true);
    assert.equal(isSnapVersionOlder('0.9.9', '1.0.0'), true);
    assert.equal(isSnapVersionOlder('2.0.0', '1.99.99'), false);
  });

  it('reads a range-style or prerelease version by its major.minor.patch', () => {
    assert.equal(isSnapVersionOlder('^1.8.0', '1.8.0'), false);
    assert.equal(isSnapVersionOlder('1.8.0-rc1', '1.8.0'), false);
  });

  it('rejects text that is not a version', () => {
    assert.throws(() => isSnapVersionOlder('latest', '1.8.0'), /Not a MetaMask snap version/);
  });

  it('takes the standard memo layout from snap 1.8.0 on', () => {
    assert.equal(snapWritesStandardMemoLayout('1.6.0'), false);
    assert.equal(snapWritesStandardMemoLayout('1.7.0'), false);
    assert.equal(snapWritesStandardMemoLayout('1.8.0'), true);
    assert.equal(snapWritesStandardMemoLayout('1.9.0'), true);
  });

  it('asks for the configured version, or the default when unset', () => {
    assert.equal(requiredSnapVersion('1.8.0'), '1.8.0');
    assert.equal(requiredSnapVersion(undefined), DEFAULT_METAMASK_SNAP_VERSION);
    assert.equal(requiredSnapVersion(''), DEFAULT_METAMASK_SNAP_VERSION);
  });
});

/** A MetaMask with the snap at `installed` (or none); `update` decides what `wallet_requestSnaps` does. */
const createSnap = (installed: string | undefined, update: (version: string) => string | Error) => {
  const installRequests: string[] = [];
  let version = installed;
  return {
    installRequests,
    snap: {
      getInstalledVersion: async () => version,
      install: async (requested: string) => {
        installRequests.push(requested);
        const outcome = update(requested);
        if (outcome instanceof Error) throw outcome;
        version = outcome;
      }
    }
  };
};

describe('metamask-snap-version: ensureSnapVersion', () => {
  it('installs the required version when no snap is installed', async () => {
    const { snap, installRequests } = createSnap(undefined, (requested) => requested);

    assert.equal(await ensureSnapVersion(snap, '1.8.0'), '1.8.0');
    assert.deepEqual(installRequests, ['1.8.0']);
  });

  it('propagates a declined first install as it is', async () => {
    const declined = new Error('User rejected the request.');
    const { snap } = createSnap(undefined, () => declined);

    await assert.rejects(ensureSnapVersion(snap, '1.6.0'), (error) => error === declined);
  });

  it('uses an installed snap at or above the required version without asking MetaMask', async () => {
    for (const installed of ['1.6.0', '1.7.0', '1.8.0']) {
      const { snap, installRequests } = createSnap(installed, () => new Error('not called'));

      assert.equal(await ensureSnapVersion(snap, '1.6.0'), installed);
      assert.deepEqual(installRequests, []);
    }
  });

  it('offers the update of an older installed snap and uses the updated one', async () => {
    const { snap, installRequests } = createSnap('1.6.0', (requested) => requested);

    assert.equal(await ensureSnapVersion(snap, '1.8.0'), '1.8.0');
    assert.deepEqual(installRequests, ['1.8.0']);
  });

  it('reports an older installed snap whose update was declined or is not allowlisted', async () => {
    const declined = new Error('Cannot install version "1.8.0" of snap: The snap is not on the allowlist.');
    const { snap, installRequests } = createSnap('1.7.0', () => declined);

    await assert.rejects(ensureSnapVersion(snap, '1.8.0'), (error) => {
      assert.ok(error instanceof OutdatedMetaMaskSnapError);
      assert.equal(error.installedVersion, '1.7.0');
      assert.equal(error.requiredVersion, '1.8.0');
      assert.equal(error.cause, declined);
      assert.match(error.message, /version 1\.7\.0, older than the 1\.8\.0 required/);
      return true;
    });
    assert.deepEqual(installRequests, ['1.8.0']);
  });

  it('reports an older snap MetaMask left installed after the request', async () => {
    const { snap } = createSnap('1.6.0', () => '1.6.0');

    await assert.rejects(ensureSnapVersion(snap, '1.8.0'), OutdatedMetaMaskSnapError);
  });
});
