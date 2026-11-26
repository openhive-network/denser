import { describe, it } from 'mocha';
import { expect } from 'chai';
import { JsonRpcApiError } from './read-client';
import { ReadTransportError } from './read-transport';
import { isPostDeletedError } from './deleted-post';

const answer = (error: Record<string, unknown>) =>
  new JsonRpcApiError('bridge.get_post', { jsonrpc: '2.0', id: 1, error });

describe('isPostDeletedError', () => {
  it("is true for hivemind's answer for a post its author deleted", () => {
    const deleted = answer({
      code: -31999,
      message: 'Invalid parameters',
      data: 'Post lampwork/tp1622 was deleted 1 time(s)'
    });
    expect(isPostDeletedError(deleted)).to.equal(true);
  });

  it('is false for a post that never existed', () => {
    const missing = answer({
      code: -32602,
      message: 'Invalid parameters',
      data: 'Post lampwork/no-such-post-1786 does not exist'
    });
    expect(isPostDeletedError(missing)).to.equal(false);
  });

  it('is false for another invalid-parameters answer', () => {
    const otherInvalid = answer({ code: -31999, message: 'Invalid parameters', data: 'invalid permlink length' });
    expect(isPostDeletedError(otherInvalid)).to.equal(false);
  });

  it('is false for the deleted text under another code', () => {
    const otherCode = answer({ code: -32602, message: 'Invalid parameters', data: 'Post a/b was deleted 1 time(s)' });
    expect(isPostDeletedError(otherCode)).to.equal(false);
  });

  it('is false for a transport failure and a plain error with the deleted text', () => {
    const transport = new ReadTransportError('HTTP 504', {
      method: 'POST',
      endpoint: 'https://api.example',
      url: '',
      timeout: 1000,
      responseType: 'json'
    });
    expect(isPostDeletedError(transport)).to.equal(false);
    expect(isPostDeletedError(new Error('Post lampwork/tp1622 was deleted 1 time(s)'))).to.equal(false);
  });
});
