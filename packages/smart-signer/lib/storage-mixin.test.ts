import { describe, it } from 'mocha';
import { expect } from 'chai';
import { StorageMixin } from './storage-mixin';

/**
 * Regression: fixing SignerHiveauth to extend `StorageMixin(Signer)` (an
 * abstract class) surfaced a bug where `StorageMixin`'s generic constraint
 * only accepted concrete constructors - TypeScript silently dropped every
 * member of an abstract base (encryptData, decryptData, etc.) from the
 * result, with no error at the call site. Real signer classes can't be
 * tested directly here (ESM/CJS wall), so this reproduces the bug shape with
 * a local fake abstract base instead.
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
    expect(instance.requiredMethod()).to.equal('implemented');
    expect(instance.concreteMethod()).to.equal('default for quochuy');
  });

  it('a subclass that does not override the abstract method inherits the base default (none here) and still gets storage', () => {
    abstract class FakeAbstractSignerWithDefault extends FakeAbstractSigner {
      requiredMethod(): string {
        return 'base default';
      }
    }

    class FakeConcreteSignerWithDefault extends StorageMixin(FakeAbstractSignerWithDefault) {}

    const instance = new FakeConcreteSignerWithDefault({ username: 'quochuy', storageType: 'memoryStorage' });

    expect(instance.requiredMethod()).to.equal('base default');
    expect(instance.storageType).to.equal('memoryStorage');
  });
});
