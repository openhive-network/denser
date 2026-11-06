import { describe, it } from 'mocha';
import { expect } from 'chai';
import type { IReadRequest } from './read-client';
import { ReadTransportError, isNodeRequestFailure } from './read-transport';

const REQUEST: IReadRequest = {
  method: 'POST',
  endpoint: 'https://api.example',
  url: '/',
  timeout: 1000,
  responseType: 'json'
};

/** What the read client throws when `fetch` fails offline: a TypeError kept as the cause */
const offlineReadError = () =>
  new ReadTransportError(
    'Unknown request error caught (possible network or CORS error): "POST https://api.example/"',
    REQUEST,
    undefined,
    new TypeError('Failed to fetch')
  );

/** An error with wax's class name, as `instanceof` misses one from another wax instance */
const waxError = (name: string, message: string, options?: ErrorOptions) => {
  const error = new Error(message, options);
  error.name = name;
  return error;
};

describe('isNodeRequestFailure', () => {
  it("is true for the read client's failure to reach the node", () => {
    expect(isNodeRequestFailure(offlineReadError())).to.equal(true);
  });

  it("is true for wax's request timeout, also wrapped by a signer", () => {
    const timeout = waxError('WaxRequestTimeoutError', 'Request timed out');
    expect(isNodeRequestFailure(timeout)).to.equal(true);
    expect(isNodeRequestFailure(new Error('Unlock check failed', { cause: timeout }))).to.equal(true);
  });

  it('is false for an answer the node gave, and for anything else', () => {
    expect(
      isNodeRequestFailure(waxError('WaxChainApiError', 'Assert Exception: account does not exist'))
    ).to.equal(false);
    expect(isNodeRequestFailure(new TypeError('Failed to fetch'))).to.equal(false);
    expect(isNodeRequestFailure('ReadTransportError')).to.equal(false);
    expect(isNodeRequestFailure(undefined)).to.equal(false);
  });
});
