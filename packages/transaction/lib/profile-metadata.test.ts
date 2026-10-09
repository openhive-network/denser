import { describe, it } from 'mocha';
import { expect } from 'chai';
import { mergePostingJsonMetadata } from './profile-metadata';

describe('mergePostingJsonMetadata', () => {
  it('keeps keys set by other frontends, top-level and inside profile', () => {
    const current = JSON.stringify({
      other_app: { theme: 'dark' },
      profile: { name: 'Old', type: 'app', redirect_uris: ['http://localhost:3000/callback'] }
    });
    const merged = JSON.parse(mergePostingJsonMetadata(current, { name: 'New', social: { x: 'alice' }, version: 2 }));
    expect(merged).to.deep.equal({
      other_app: { theme: 'dark' },
      profile: {
        type: 'app',
        redirect_uris: ['http://localhost:3000/callback'],
        name: 'New',
        social: { x: 'alice' },
        version: 2
      }
    });
  });

  it('removes managed fields the update leaves empty, and an empty social', () => {
    const current = JSON.stringify({
      profile: { about: 'old bio', location: 'KTW', social: { x: 'alice', ig: 'alice' } }
    });
    const merged = JSON.parse(mergePostingJsonMetadata(current, { location: 'KTW', social: {}, version: 2 }));
    expect(merged).to.deep.equal({ profile: { location: 'KTW', version: 2 } });
  });

  it('replaces social wholesale so a cleared handle is dropped', () => {
    const current = JSON.stringify({ profile: { social: { x: 'alice', ig: 'alice' } } });
    const merged = JSON.parse(mergePostingJsonMetadata(current, { social: { ig: 'bob' }, version: 2 }));
    expect(merged.profile.social).to.deep.equal({ ig: 'bob' });
  });

  it('starts from empty metadata when the current one is missing or not a JSON object', () => {
    for (const current of [undefined, '', '{broken', '[]', 'null', '{"profile":"str"}']) {
      expect(JSON.parse(mergePostingJsonMetadata(current, { name: 'A', version: 2 })), String(current)).to.deep.equal({
        profile: { name: 'A', version: 2 }
      });
    }
  });
});
