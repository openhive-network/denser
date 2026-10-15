import { describe, it } from 'mocha';
import { expect } from 'chai';
import { getPostCategory, getPostPath } from './post-category';

describe('getPostCategory', () => {
  it('uses the first tag for a "My blog" post', () => {
    expect(getPostCategory('blog', ['test', 'hive'])).to.equal('test');
  });

  it('keeps the community name for a community post', () => {
    expect(getPostCategory('hive-123456', ['test', 'hive'])).to.equal('hive-123456');
  });

  it('keeps "blog" when it is really the first tag', () => {
    expect(getPostCategory('blog', ['blog', 'hive'])).to.equal('blog');
  });
});

describe('getPostPath', () => {
  it('names the first tag as the category of a "My blog" post', () => {
    expect(getPostPath('guest4test', 'my-post', 'blog', ['test', 'hive'])).to.equal(
      '/test/@guest4test/my-post'
    );
  });

  it('names the community as the category of a community post', () => {
    expect(getPostPath('guest4test', 'my-post', 'hive-123456', ['test'])).to.equal(
      '/hive-123456/@guest4test/my-post'
    );
  });
});
