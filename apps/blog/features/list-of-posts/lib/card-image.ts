import { Entry } from '@hive/common-hiveio-packages/wax';
import { proxifyImageSrc } from '@ui/lib/proxify-images';
import { getUserAvatarUrl } from '@ui/lib/avatar-utils';
import dmcaUserList from '@ui/config/lists/dmca-user-list';
import imageUserBlocklist from '@ui/config/lists/image-user-blocklist';
import userIllegalContent from '@ui/config/lists/user-illegal-content';
import gdprUserList from '@ui/config/lists/gdpr-user-list';
import { customEndsWith } from '@/blog/lib/ends-with';
import {
  extractPictureFromPostBody,
  extractUrlsFromJsonString,
  extractYouTubeVideoIds
} from '@/blog/lib/utils';
import type { TrimmedEntry, CardEntry } from './card-entry';

// The first feed images are the LCP candidates, so they must not wait for lazy-loading.
export const PRIORITY_IMAGE_COUNT = 2;

// Match condenser's 256x512 to share image cache at images.hive.blog
const UX_IMAGE_WIDTH = 256;
const UX_IMAGE_HEIGHT = 512;

export function find_first_img(post: Entry) {
  try {
    if (
      post.json_metadata.links &&
      post.json_metadata.links[0] &&
      customEndsWith(post.json_metadata.links[0].slice(0, post.json_metadata.links[0].length - 1), [
        'png',
        'webp',
        'jpeg',
        'jpg'
      ])
    ) {
      return proxifyImageSrc(
        post.json_metadata.links[0].slice(0, post.json_metadata.links[0].length - 1),
        UX_IMAGE_WIDTH,
        UX_IMAGE_HEIGHT
      );
    }
    if (post.original_entry && post.original_entry.json_metadata.images) {
      return proxifyImageSrc(post.original_entry.json_metadata.images[0], UX_IMAGE_WIDTH, UX_IMAGE_HEIGHT);
    }
    if (post.original_entry && post.original_entry.json_metadata.image) {
      return proxifyImageSrc(post.original_entry.json_metadata.image[0], UX_IMAGE_WIDTH, UX_IMAGE_HEIGHT);
    }
    if (post.json_metadata.image && post.json_metadata.image[0]) {
      if (post.json_metadata.image[0].includes('youtu-')) {
        return proxifyImageSrc(
          `https://img.youtube.com/vi/${post.json_metadata.image[0].slice(6)}/0.jpg`,
          UX_IMAGE_WIDTH,
          UX_IMAGE_HEIGHT
        );
      }
      return proxifyImageSrc(post.json_metadata.image[0], UX_IMAGE_WIDTH, UX_IMAGE_HEIGHT);
    }
    const regex_any_img = /!\[.*?\]\((.*?)\)/;
    const match = post.body.match(regex_any_img);
    if (match && match[1]) {
      return proxifyImageSrc(match[1], UX_IMAGE_WIDTH, UX_IMAGE_HEIGHT);
    }
    if (post.json_metadata.images && post.json_metadata.images[0]) {
      return proxifyImageSrc(post.json_metadata.images[0], UX_IMAGE_WIDTH, UX_IMAGE_HEIGHT);
    }
    if (post.json_metadata.flow?.pictures && post.json_metadata.flow?.pictures[0]) {
      return proxifyImageSrc(post.json_metadata.flow?.pictures[0].url, UX_IMAGE_WIDTH, UX_IMAGE_HEIGHT);
    }
    const youtube_id = extractYouTubeVideoIds(extractUrlsFromJsonString(post.body));
    if (youtube_id[0]) {
      return proxifyImageSrc(`https://img.youtube.com/vi/${youtube_id[0]}/0.jpg`, UX_IMAGE_WIDTH, UX_IMAGE_HEIGHT);
    }
    if (Array.isArray(post.json_metadata?.tags) && post.json_metadata.tags.includes('nsfw')) {
      return proxifyImageSrc(getUserAvatarUrl(post.author, 'small'), UX_IMAGE_WIDTH, UX_IMAGE_HEIGHT);
    }
    const pictures_extracted = extractPictureFromPostBody(extractUrlsFromJsonString(post.body));
    if (pictures_extracted[0]) {
      return proxifyImageSrc(pictures_extracted[0], UX_IMAGE_WIDTH, UX_IMAGE_HEIGHT);
    }
    const regex_for_peakd = /https:\/\/files\.peakd\.com\/[^\s]+\.jpg/;
    const peakd_img = post.body.match(regex_for_peakd);
    if (peakd_img !== null) {
      return proxifyImageSrc(peakd_img[0], UX_IMAGE_WIDTH, UX_IMAGE_HEIGHT);
    }
    const regexgif = /<img\s+src="([^"]+)"/;
    const matchgif = post.body.match(regexgif);
    if (matchgif && matchgif[1]) {
      return proxifyImageSrc(matchgif[1], UX_IMAGE_WIDTH, UX_IMAGE_HEIGHT);
    }
    // Last fallback: use user profile image if available, otherwise use avatar
    if (!post.title.includes('RE: ') && post.depth === 0) {
      return getUserAvatarUrl(post.author, 'large');
    }
    return '';
  } catch (e) {
    console.error('Error in find_first_img:', e);
    return '';
  }
}

/** Whether the post's author or blacklist status hides its card image for every viewer. */
export function isCardImageRestricted(post: TrimmedEntry): boolean {
  return (
    post.blacklists.length > 0 ||
    dmcaUserList.includes(post.author) ||
    imageUserBlocklist.includes(post.author) ||
    userIllegalContent.includes(post.author)
  );
}

function isNsfw(post: TrimmedEntry): boolean {
  return Array.isArray(post.json_metadata?.tags) && post.json_metadata.tags.includes('nsfw');
}

/**
 * Returns the image of the first leading feed card that server-renders one, or '' if none does.
 *
 * Mirrors PostList/PostListItem: nsfw cards start in "warn" (no image) and gray cards
 * hide theirs, so neither is a visible LCP candidate.
 */
export function findFirstVisibleCardImage(entries: CardEntry[]): string {
  const leadingCards = entries.filter((post) => post?.author && post.permlink).slice(0, PRIORITY_IMAGE_COUNT);
  for (const post of leadingCards) {
    if (gdprUserList.includes(post.author) || isNsfw(post) || post.stats?.gray || isCardImageRestricted(post)) {
      continue;
    }
    if (post.cardImage) return post.cardImage;
  }
  return '';
}
