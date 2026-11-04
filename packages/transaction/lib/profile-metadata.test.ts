import { describe, it } from 'mocha';
import { expect } from 'chai';
import { mergePostingJsonMetadata, readAccountProfile } from './profile-metadata';

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

describe('readAccountProfile', () => {
  it('drops profile fields whose value is not a string', () => {
    for (const about of [123, true, {}, [{}], null]) {
      const metadata = JSON.stringify({ profile: { about, name: 'Alice', location: 7, website: ['x'] } });
      expect(readAccountProfile(metadata, undefined), JSON.stringify(about)).to.deep.equal({ name: 'Alice' });
    }
  });

  it('keeps string profile fields and ignores keys outside AccountProfile', () => {
    const metadata = JSON.stringify({
      profile: { about: 'bio', name: 'Alice', location: 'KTW', website: 'https://a.example', version: 2 }
    });
    expect(readAccountProfile(metadata, undefined)).to.deep.equal({
      about: 'bio',
      name: 'Alice',
      location: 'KTW',
      website: 'https://a.example'
    });
  });

  it('falls back to json_metadata when posting_json_metadata has no profile object', () => {
    const fallback = JSON.stringify({ profile: { about: 'legacy', name: 42 } });
    for (const posting of [undefined, '{broken', '{}', '{"profile":"str"}']) {
      expect(readAccountProfile(posting, fallback), String(posting)).to.deep.equal({ about: 'legacy' });
    }
  });

  it('returns empty text fields when neither metadata has a profile', () => {
    expect(readAccountProfile('{}', '[]')).to.deep.equal({
      about: '',
      cover_image: '',
      location: '',
      name: '',
      profile_image: '',
      website: ''
    });
  });
});
