import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// Under node's type stripping the `@smart-signer/` alias does not resolve: no browser storage is
// available to the test, and the in-memory one is the module's own.
const NO_BROWSER_STORAGE_MODULE = 'data:text/javascript,export const isStorageAvailable = () => false;';
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@smart-signer/lib/utils') return { url: NO_BROWSER_STORAGE_MODULE, shortCircuit: true };
    if (specifier === '@smart-signer/lib/memory-storage') return nextResolve('./memory-storage.ts', context);
    return nextResolve(specifier, context);
  }
});

const { StorageMixin } = await import('./storage-mixin.ts');

/**
 * Regression: fixing SignerHiveauth to extend `StorageMixin(Signer)` (an
 * abstract class) surfaced a bug where `StorageMixin`'s generic constraint
 * only accepted concrete constructors - TypeScript silently dropped every
 * member of an abstract base (encryptData, decryptData, etc.) from the
 * result, with no error at the call site. Real signer classes pull in the
 * app's path aliases and wax, so this reproduces the bug shape with a local
 * fake abstract base instead.
 */
describe('StorageMixin: preserves an abstract base class\'s members (regression)', () => {
  abstract class FakeAbstractSigner {
    username: string;
    storageType: 'localStorage' | 'sessionStorage' | 'memoryStorage';

    constructor({ username, storageType }: { username: string; storageType: 'localStorage' | 'sessionStorage' | 'memoryStorage' }) {
      this.username = username;
      this.storageType = storageType;
    }

    abstract requiredMethod(): string;

    concreteMethod(): string {
      return `default for ${this.username}`;
    }
  }

  it('mixing in an abstract base keeps its concrete methods usable on a concrete subclass', () => {
    class FakeConcreteSigner extends StorageMixin(FakeAbstractSigner) {
      requiredMethod(): string {
        return 'implemented';
      }
    }

    const instance = new FakeConcreteSigner({ username: 'quochuy', storageType: 'memoryStorage' });

    // Regression would fail to compile here, not just at runtime.
    assert.equal(instance.requiredMethod(), 'implemented');
    assert.equal(instance.concreteMethod(), 'default for quochuy');
  });

  it('a subclass that does not override the abstract method inherits the base default (none here) and still gets storage', () => {
    abstract class FakeAbstractSignerWithDefault extends FakeAbstractSigner {
      requiredMethod(): string {
        return 'base default';
      }
    }

    class FakeConcreteSignerWithDefault extends StorageMixin(FakeAbstractSignerWithDefault) {}

    const instance = new FakeConcreteSignerWithDefault({ username: 'quochuy', storageType: 'memoryStorage' });

    assert.equal(instance.requiredMethod(), 'base default');
    assert.equal(instance.storageType, 'memoryStorage');
  });
});
