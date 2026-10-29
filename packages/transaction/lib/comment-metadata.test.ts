import { describe, it } from 'mocha';
import { expect } from 'chai';
import { buildCommentJsonMetadata, type CommentBodyMetadata } from './comment-metadata';
import { PUBLISHING_APP } from './publishing-app';

const PLAIN_BODY: CommentBodyMetadata = { hashtags: [], usertags: [], images: [], links: [] };

describe('buildCommentJsonMetadata', () => {
  it('writes every field for a body with a hashtag, a mention, an image and links', () => {
    const metadata = buildCommentJsonMetadata({
      hashtags: ['photography'],
      usertags: ['alice'],
      images: ['https://images.hive.blog/cat.png'],
      links: ['https://example.com/article', 'https://example.org/page']
    });
    expect(metadata).to.deep.equal({
      tags: ['photography'],
      users: ['alice'],
      image: ['https://images.hive.blog/cat.png'],
      links: ['https://example.com/article'],
      app: PUBLISHING_APP,
      format: 'markdown'
    });
  });

  it('omits empty fields for a plain body', () => {
    expect(buildCommentJsonMetadata(PLAIN_BODY)).to.deep.equal({ app: PUBLISHING_APP, format: 'markdown' });
  });

  it('keeps at most 8 hashtags, in body order', () => {
    const hashtags = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
    expect(buildCommentJsonMetadata({ ...PLAIN_BODY, hashtags }).tags).to.deep.equal(hashtags.slice(0, 8));
  });

  it('on edit keeps keys of another frontend and recomputes its own from the new body', () => {
    const current = JSON.stringify({
      app: 'peakd/2026.10.1',
      format: 'markdown+html',
      tags: ['old'],
      users: ['carol'],
      image: ['https://example.com/old.png'],
      links: ['https://example.com/old'],
      canonical_url: 'https://peakd.com/@alice/re-x'
    });
    expect(buildCommentJsonMetadata({ ...PLAIN_BODY, usertags: ['dave'] }, current)).to.deep.equal({
      canonical_url: 'https://peakd.com/@alice/re-x',
      users: ['dave'],
      app: PUBLISHING_APP,
      format: 'markdown'
    });
  });

  it('accepts the already-parsed json_metadata a bridge entry carries, without mutating it', () => {
    const current = { description: 'kept', tags: ['old'] };
    expect(buildCommentJsonMetadata(PLAIN_BODY, current)).to.deep.equal({
      description: 'kept',
      app: PUBLISHING_APP,
      format: 'markdown'
    });
    expect(current).to.deep.equal({ description: 'kept', tags: ['old'] });
  });

  it('treats unparseable or non-object current metadata as empty', () => {
    expect(buildCommentJsonMetadata(PLAIN_BODY, '{not json')).to.deep.equal({ app: PUBLISHING_APP, format: 'markdown' });
    expect(buildCommentJsonMetadata(PLAIN_BODY, ['x'])).to.deep.equal({ app: PUBLISHING_APP, format: 'markdown' });
  });
});
