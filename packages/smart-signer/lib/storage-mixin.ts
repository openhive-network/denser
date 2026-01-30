import { isStorageAvailable } from '@smart-signer/lib/utils';
import { memoryStorage } from '@smart-signer/lib/memory-storage';

export type StorageType = 'localStorage' | 'sessionStorage' | 'memoryStorage';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TypeScript mixin pattern requires any[] for constructor args
type GConstructor<T = {}> = new (...args: any[]) => T;
type WithStorage = GConstructor<{ storageType: StorageType }>;

export interface StorageBaseOptions {
    storageType: StorageType;
}

export class StorageBase {
    storageType: StorageType;
    constructor({ storageType = 'localStorage' }: StorageBaseOptions) {
        if (storageType) {
            this.storageType = storageType;
        } else {
            throw new Error('StorageBase constructor: storageType must be non-empty string');
        }
    }
}

/**
 * Adds Storage, on client side.
 *
 * @export
 * @template TBase
 * @param {TBase} Base - Base class to extend with storage capabilities
 * @returns
 */
// eslint-disable-next-line @typescript-eslint/naming-convention -- Base is PascalCase by convention for class mixins
export function StorageMixin<TBase extends WithStorage>(Base: TBase) {

    return class extends Base {

        storage: Storage;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TypeScript mixin pattern requires any[] for constructor args
        constructor(...args: any[]) {
            super(...args);
            if (this.storageType === 'localStorage'
                    && isStorageAvailable(this.storageType)) {
                // eslint-disable-next-line no-restricted-properties -- This is a low-level storage abstraction mixin that provides direct storage access
                this.storage = window.localStorage;
            } else if (this.storageType === 'sessionStorage'
                    && isStorageAvailable(this.storageType)) {
                this.storage = window.sessionStorage;
            } else {
                this.storageType = 'memoryStorage';
                this.storage = memoryStorage;
            }
        }

    }
}
