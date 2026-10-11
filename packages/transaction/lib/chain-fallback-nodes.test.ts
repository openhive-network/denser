import { describe, it } from 'mocha';
import { expect } from 'chai';
import { getBrowserFallbackNodes } from './chain';

describe('getBrowserFallbackNodes', () => {
  it('is exactly the configured allowed API nodes, none of the other nodes the picker offers', () => {
    expect(getBrowserFallbackNodes()).to.deep.equal([
      'https://api.hive.blog',
      'https://api.syncad.com',
      'https://api.openhive.network'
    ]);
  });
});
