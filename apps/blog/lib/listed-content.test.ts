import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Entry } from '@hive/common-hiveio-packages/wax';
import { isPostListed, isProfileListed, withholdBody, withholdEntryBody } from './listed-content.ts';

describe('isProfileListed', () => {
  it('hides a GDPR-listed account', () => {
    assert.equal(isProfileListed('xondra'), true);
  });

  it('hides a legally blocked account', () => {
    assert.equal(isProfileListed('aplomb'), true);
  });

  it('shows an unlisted account', () => {
    assert.equal(isProfileListed('acidyo'), false);
  });
});

describe('isPostListed', () => {
  it('hides a post at a DMCA-listed path', () => {
    assert.equal(isPostListed('motivation', 'carlidos', 'the-power-that-moves-the-world'), true);
  });

  it('shows the same author elsewhere when only the path is listed', () => {
    assert.equal(isPostListed('motivation', 'carlidos', 'another-post'), false);
  });

  it('hides any post of a DMCA-listed author', () => {
    assert.equal(isPostListed('hive-1', 'the-gaming-llama', 'any'), true);
  });

  it('hides any post of a GDPR-listed or legally blocked author', () => {
    assert.equal(isPostListed('hive-1', 'xondra', 'any'), true);
    assert.equal(isPostListed('hive-1', 'aplomb', 'any'), true);
  });

  it('shows an unlisted post', () => {
    assert.equal(isPostListed('back', 'acidyo', 'back-at-the-station'), false);
  });
});

const BODY = 'The power that moves the world is gratitude.';

function entry(author: string, permlink: string): Entry {
  // Only the fields the withholding reads or must keep; the rest of an Entry is irrelevant here.
  const fields: Partial<Entry> = {
    author,
    permlink,
    title: 'The power that moves the world',
    body: BODY,
    depth: 0,
    json_metadata: {
      tags: ['motivation'],
      app: 'hiveblog/0.1',
      description: 'gratitude moves the world',
      summary: 'gratitude',
      image: 'https://images.hive.blog/a.png',
      images: ['https://images.hive.blog/a.png'],
      links: ['https://example.com/source'],
      author: undefined
    }
  };
  return fields as Entry;
}

describe('withholdBody', () => {
  it('drops the body and the metadata derived from it and marks the entry', () => {
    const withheld = withholdBody(entry('carlidos', 'the-power-that-moves-the-world'));
    assert.equal(withheld.body, '');
    assert.equal(withheld._bodyWithheld, true);
    assert.equal(JSON.stringify(withheld).includes('gratitude'), false);
    assert.equal(JSON.stringify(withheld).includes('images.hive.blog'), false);
    assert.equal(JSON.stringify(withheld).includes('example.com'), false);
  });

  it('keeps what the page shows besides the body', () => {
    const withheld = withholdBody(entry('carlidos', 'the-power-that-moves-the-world'));
    assert.equal(withheld.title, 'The power that moves the world');
    assert.equal(withheld.author, 'carlidos');
    assert.deepEqual(withheld.json_metadata.tags, ['motivation']);
    assert.equal(withheld.json_metadata.app, 'hiveblog/0.1');
  });
});

describe('withholdEntryBody', () => {
  it('withholds only the named entry of a discussion', () => {
    const entries = withholdEntryBody(
      {
        'carlidos/the-power-that-moves-the-world': entry('carlidos', 'the-power-that-moves-the-world'),
        'acidyo/re-the-power': entry('acidyo', 're-the-power')
      },
      'carlidos',
      'the-power-that-moves-the-world'
    );
    assert.equal(entries['carlidos/the-power-that-moves-the-world'].body, '');
    assert.equal(entries['acidyo/re-the-power'].body, BODY);
    assert.equal(entries['acidyo/re-the-power']._bodyWithheld, undefined);
  });
});
