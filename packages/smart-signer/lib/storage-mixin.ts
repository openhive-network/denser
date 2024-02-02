import { isStorageAvailable } from '@smart-signer/lib/utils';
import { memoryStorage } from '@smart-signer/lib/memory-storage';

type GConstructor<T = {}> = new (...args: any[]) => T;
type WithStorage = GConstructor<{ storageType: 'localStorage' | 'sessionStorage' | 'memoryStorage'; }>;

export function StorageMixin<TBase extends WithStorage>(Base: TBase) {

    return class extends Base {
        storage: Storage;

        constructor(...args: any[]) {
            super(...args);
            if (this.storageType === 'localStorage'
                && isStorageAvailable(this.storageType)) {
                this.storage = window.localStorage;
            } else if (this.storageType === 'sessionStorage'
                && isStorageAvailable(this.storageType)) {
                this.storage = window.sessionStorage;
            } else {
                this.storage = memoryStorage;
            }

        }

    }
}
