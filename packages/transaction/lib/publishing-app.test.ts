import { describe, it } from 'mocha';
import { expect } from 'chai';
import { PUBLISHING_APP } from './publishing-app';

describe('PUBLISHING_APP', () => {
  it('uses conventional app_name/version form with denser identity', () => {
    expect(PUBLISHING_APP).to.match(/^denser\/\d+(\.\d+)*$/);
    expect(PUBLISHING_APP.split('/')).to.have.length(2);
  });
});
