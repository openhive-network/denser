import { describe, it } from 'mocha';
import { expect } from 'chai';
import { getOperationNames } from './operation-names';

describe('getOperationNames', () => {
  it('names each operation by its type, without its body', () => {
    const names = getOperationNames([
      { vote_operation: { voter: 'alice', author: 'bob', permlink: 'post', weight: 10000 } },
      { comment_operation: { author: 'alice', body: 'secret draft' } }
    ]);

    expect(names).to.deep.equal(['vote_operation', 'comment_operation']);
  });

  it('skips the unset type keys a protobuf operation object carries', () => {
    expect(getOperationNames([{ transfer_operation: undefined, custom_json_operation: { id: 'follow' } }])).to.deep.equal([
      'custom_json_operation'
    ]);
  });

  it('returns no names for a transaction without operations', () => {
    expect(getOperationNames([])).to.deep.equal([]);
  });
});
