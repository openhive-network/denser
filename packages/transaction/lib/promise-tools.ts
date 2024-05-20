import { setIntervalAsync, clearIntervalAsync } from 'set-interval-async/fixed';

export class PromiseTools {

    /**
     * Delays given promise to given amount of time.
     *
     * @static
     * @param {number} [ms=1000]
     * @param {Promise<any>} promise
     * @returns {Promise<any>}
     * @memberof Tools
     */
    public static async promiseDelay(ms: number = 1000, promise: Promise<any>)
        : Promise<any> {
        const data = await Promise.all([
            promise,
            PromiseTools.promiseTimeout(ms),
        ]);
        return data[0];
    }

    /**
     * Returns given promise wrapped into Promise.race, to have timeout
     * functionality for given promise.
     * See https://italonascimento.github.io/applying-a-timeout-to-your-promises/
     *
     * @static
     * @param {number} ms
     * @param {Promise<any>} promise
     * @returns
     * @memberof Tools
     */
    public static promiseTimeoutWrapper(ms: number, promise: Promise<any>)
        : Promise<any> {
        // Create a promise that rejects in <ms> milliseconds.
        const promiseTimeout = PromiseTools.promiseTimeout(ms, false);
        // Return a race between our timeout and the passed in promise.
        return Promise.race([
            promise,
            promiseTimeout,
        ]);
    }

    /**
     * Returns Promise, that resolves or rejects after given time.
     *
     * @static
     * @param {number} ms
     * @param {boolean} [success=true]
     * @returns {Promise<any>}
     * @memberof Tools
     */
    public static promiseTimeout(ms: number = 1000, success = true): Promise<any> {
        // Create a promise that rejects in <ms> milliseconds.
        const myPromise = new Promise((resolve, reject) => {
            const id = setTimeout(() => {
                clearTimeout(id);
                if (success) {
                    resolve('Resolved in ' + ms + 'ms.');
                } else {
                    reject('Timed out in ' + ms + 'ms.');
                }
            }, ms);
        });
        return myPromise;
    }

    /**
     * Returns promise that runs given callback `triesLeft` times. When
     * callback returns anything successful, resolves with its result.
     * Rejects after `triesLeft` times.
     *
     * @static
     * @param {Function} callback
     * @param {number} [ms=1000]
     * @param {number} [triesLeft=5]
     * @returns
     * @memberof PromiseTools
     */
    public static async promiseInterval(
        callback: () => Promise<any>,
        ms = 1000,
        triesLeft = 5,
        rejectValue = 'Failure'
    ) {
        return new Promise((resolve, reject) => {
            const interval = setIntervalAsync(async () => {
                const result = await callback();
                if (result) {
                    resolve(result);
                    clearIntervalAsync(interval);
                }
                if (triesLeft <= 1) {
                    reject(rejectValue);
                    clearIntervalAsync(interval)
                };
                triesLeft--;
            }, ms);
        });
    }

}
