import { describe, it } from 'mocha';
import { expect } from 'chai';
import { Connectivity } from './connectivity';
import { createChunkLoader } from './load-chunk';

const goOffline = () => {
  const connectivity = new Connectivity();
  const target = new EventTarget();
  connectivity.followBrowser(target);
  target.dispatchEvent(new Event('offline'));
  return { connectivity, goOnline: () => target.dispatchEvent(new Event('online')) };
};

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

describe('createChunkLoader', () => {
  it('fails at once with a ChunkLoadError while the browser is offline, without loading', async () => {
    const { connectivity } = goOffline();
    let loads = 0;
    const load = createChunkLoader(async () => ++loads, { connectivity });

    const error = await load().catch((e: unknown) => e);

    expect(error).to.be.instanceOf(Error).with.property('name', 'ChunkLoadError');
    expect(loads).to.equal(0);
  });

  it('loads once more when the browser is back online, so the next call finds the code', async () => {
    const { connectivity, goOnline } = goOffline();
    let loads = 0;
    const load = createChunkLoader(async () => ++loads, { connectivity });
    await load().catch(() => undefined);
    await load().catch(() => undefined);

    goOnline();
    goOnline();
    await flush();

    expect(loads).to.equal(1);
  });

  it('fails with a ChunkLoadError when loading outlasts the timeout', async () => {
    const load = createChunkLoader(() => new Promise<never>(() => undefined), { timeoutMs: 5 });

    const error = await load().catch((e: unknown) => e);

    expect(error).to.be.instanceOf(Error).with.property('name', 'ChunkLoadError');
  });

  it('passes the loaded module through', async () => {
    const load = createChunkLoader(async () => ({ ready: true }), { connectivity: new Connectivity() });

    expect(await load()).to.deep.equal({ ready: true });
  });
});
