import getSlug from 'speakingurl';
import base58 from 'bs58';
import secureRandom from 'secure-random';
import { getPostHeader } from './bridge';

export async function createPermlink(title: string, author: string, postPermlink: string) {
  let permlink;
  if (title && title.trim() !== '') {
    let s = getSlug(title.replace(/[<>]/g, ''), { truncate: 128 });
    if (s === '') {
      s = base58.encode(secureRandom.randomBuffer(4));
    }
    // only letters numbers and dashes shall survive
    s = s.toLowerCase().replace(/[^a-z0-9-]+/g, '');

    // ensure the permlink is unique
    const head = await getPostHeader(author, postPermlink);
    if (head && !!head.category) {
      const noise = base58.encode(secureRandom.randomBuffer(4)).toLowerCase();
      permlink = noise + '-' + s;
    } else {
      permlink = s;
    }

    // ensure permlink conforms to STEEMIT_MAX_PERMLINK_LENGTH
    if (permlink.length > 255) {
      permlink = permlink.substring(0, 255);
    }
  } else {
    permlink = Math.floor(Date.now() / 1000).toString(36);
  }

  return permlink;
}
