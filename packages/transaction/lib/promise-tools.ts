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
     *
     * TODO This function is not tested.
     *
     * Runs callback every `ms`, until it succeeds or limit of tries is
     * reached,
     *
     * @static
     * @param {Function} callback
     * @param {number} [ms=1000]
     * @param {number} [triesLeft=5]
     * @returns
     * @memberof Tools
     */
    public static async promiseInterval(callback: Function, ms = 1000, triesLeft = 5) {
        return new Promise((resolve, reject) => {
            const interval = setInterval(async () => {
                console.log('triesLeft: %s', triesLeft);
                if (await callback()) {
                    console.log('resolve success')
                    resolve('success');
                    clearInterval(interval);
                } else if (triesLeft <= 1) {
                    console.log('resolve failure')
                    reject('failure');
                    clearInterval(interval);
                }
                triesLeft--;
            }, ms);
        });
    }

}
