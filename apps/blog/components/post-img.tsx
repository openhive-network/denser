import Link from 'next/link';
import { customEndsWith } from '../lib/ends-with';
import { proxifyImageUrl } from '@ui/lib/old-profixy';
import { extractPictureFromPostBody, extractUrlsFromJsonString, extractYouTubeVideoIds } from '../lib/utils';
import { Entry } from '@transaction/lib/extended-hive.chain'; 
import clsx from 'clsx';

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
      return proxifyImageUrl(
        post.json_metadata.links[0].slice(0, post.json_metadata.links[0].length - 1),
        true
      );
    }
    if (post.original_entry && post.original_entry.json_metadata.images) {
      return proxifyImageUrl(post.original_entry.json_metadata.images[0], true);
    }
    if (post.original_entry && post.original_entry.json_metadata.image) {
      return proxifyImageUrl(post.original_entry.json_metadata.image[0], true);
    }
    if (post.json_metadata.image && post.json_metadata.image[0]) {
      return proxifyImageUrl(post.json_metadata.image[0], true);
    }
    const regex_any_img = /!\[.*?\]\((.*?)\)/;
    const match = post.body.match(regex_any_img);
    if (match && match[1]) {
      return proxifyImageUrl(match[1], true);
    }
    if (post.json_metadata.images && post.json_metadata.images[0]) {
      return proxifyImageUrl(post.json_metadata.images[0], true);
    }
    if (post.json_metadata.flow?.pictures && post.json_metadata.flow?.pictures[0]) {
      return proxifyImageUrl(post.json_metadata.flow?.pictures[0].url, true);
    }
    const youtube_id = extractYouTubeVideoIds(extractUrlsFromJsonString(post.body));
    if (youtube_id[0]) {
      return proxifyImageUrl(`https://img.youtube.com/vi/${youtube_id[0]}/0.jpg`, true);
    }
    if (post.json_metadata?.tags && post.json_metadata?.tags.includes('nsfw')) {
      return proxifyImageUrl(`https://images.hive.blog/u/${post.author}/avatar/`, true);
    }
    const pictures_extracted = extractPictureFromPostBody(extractUrlsFromJsonString(post.body));
    if (pictures_extracted[0]) {
      return proxifyImageUrl(pictures_extracted[0], true);
    }
    const regex_for_peakd = /https:\/\/files\.peakd\.com\/[^\s]+\.jpg/;
    const peakd_img = post.body.match(regex_for_peakd);
    if (peakd_img !== null) {
      return proxifyImageUrl(peakd_img[0], true);
    }
    const regexgif = /<img\s+src="([^"]+)"/;
    const matchgif = post.body.match(regexgif);
    if (matchgif && matchgif[1]) {
      return proxifyImageUrl(matchgif[1], true);
    }
    if (!post.title.includes('RE: ') && post.depth === 0) {
      return proxifyImageUrl(`https://images.hive.blog/u/${post.author}/avatar/large`, true);
    }
    return '';
  } catch (e) {
    console.error('Error in find_first_img:', e);
    return '';
  }
}

export default function PostImage({ post }: { post: Entry }) {
  const cardImage = find_first_img(post);

  return (
    <>
      {cardImage ? (
        <Link
          href={`/${post.category}/@${post.author}/${post.permlink}`}
          data-testid="post-image"
          className={clsx({ hidden: post.stats?.gray })}
        >
          <div className="relative flex h-[210px] items-center overflow-hidden bg-transparent sm:h-[360px] md:mr-3.5 md:max-h-[80px] md:w-fit md:min-w-[130px] md:max-w-[130px]">
            <picture className="articles__feature-img h-ful w-full">
              <source
                srcSet={proxifyImageUrl(cardImage, '256x512').replace(/ /g, '%20')}
                media="(min-width: 1000px)"
              />
              <img srcSet={cardImage} alt="Post image" loading="lazy" className="w-full" />
            </picture>
          </div>
        </Link>
      ) : null}
    </>
  );
}
