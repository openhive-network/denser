import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { matchHiveBlogImageUrl, findImgTagSrc } = await import('./body-image-url.ts');

const HASH_PATH = 'https://images.hive.blog/DQmXnkfBLfEDnoK3rHb8paanjkmLhq3eicYnnZw72A2rC26';

describe('matchHiveBlogImageUrl', () => {
  it('keeps a URL-encoded space in the path', () => {
    assert.equal(
      matchHiveBlogImageUrl(`${HASH_PATH}/best%20gamesastman.png`),
      `${HASH_PATH}/best%20gamesastman.png`
    );
  });

  it('keeps dots in the file name', () => {
    assert.equal(matchHiveBlogImageUrl(`${HASH_PATH}/my.photo.png`), `${HASH_PATH}/my.photo.png`);
  });

  it('ends a bare URL at the extension when a <br /> follows it', () => {
    assert.equal(
      matchHiveBlogImageUrl(`${HASH_PATH}/best%20gamesastman.png<br`),
      `${HASH_PATH}/best%20gamesastman.png`
    );
  });

  it('ends at a closing parenthesis or quote', () => {
    assert.equal(matchHiveBlogImageUrl(`(${HASH_PATH}/a.jpg)`), `${HASH_PATH}/a.jpg`);
    assert.equal(matchHiveBlogImageUrl(`"${HASH_PATH}/a.webp"`), `${HASH_PATH}/a.webp`);
  });

  it('does not stop at an extension that only starts a longer name segment', () => {
    assert.equal(matchHiveBlogImageUrl(`${HASH_PATH}/foo.webpage.jpeg`), `${HASH_PATH}/foo.webpage.jpeg`);
  });

  it('matches the extension case-insensitively', () => {
    assert.equal(matchHiveBlogImageUrl(`${HASH_PATH}/Photo.JPG`), `${HASH_PATH}/Photo.JPG`);
  });

  it('returns null for other hosts and for non-image paths', () => {
    assert.equal(matchHiveBlogImageUrl('https://example.com/a.png'), null);
    assert.equal(matchHiveBlogImageUrl(`${HASH_PATH}/notes.txt`), null);
  });
});

describe('findImgTagSrc', () => {
  const SKATEHYPE = 'https://www.skatehype.com/tempimg/sergio_sanchez-35714-hive.jpg?1794481203';

  it('reads a single-quoted src', () => {
    assert.equal(findImgTagSrc(`Intro <img src='${SKATEHYPE}'> outro`), SKATEHYPE);
  });

  it('reads a double-quoted src', () => {
    assert.equal(findImgTagSrc(`<img src="${SKATEHYPE}" />`), SKATEHYPE);
  });

  it('reads src after other attributes', () => {
    assert.equal(findImgTagSrc(`<IMG class="wide" alt='photo' src="${SKATEHYPE}">`), SKATEHYPE);
  });

  it('ignores data-src and takes the real src', () => {
    assert.equal(findImgTagSrc(`<img data-src="https://lazy.example/x.png" src='${SKATEHYPE}'>`), SKATEHYPE);
  });

  it('returns null without an img tag or with an empty src', () => {
    assert.equal(findImgTagSrc('<p>no image</p>'), null);
    assert.equal(findImgTagSrc('<img src="">'), null);
  });
});
