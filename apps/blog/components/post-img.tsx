import Link from 'next/link';
import { customEndsWith } from '../lib/ends-with';
import { proxifyImageUrl } from '@hive/ui/lib/old-profixy';
import { extractPictureFromPostBody, extractUrlsFromJsonString, extractYouTubeVideoIds } from '../lib/utils';
import { Entry } from '@ui/lib/bridge';
import clsx from 'clsx';

export default function PostImage({ post }: { post: Entry }) {
  const pictures_extracted = extractPictureFromPostBody(extractUrlsFromJsonString(post.body));
  const youtube_id = extractYouTubeVideoIds(extractUrlsFromJsonString(post.body));
  const regex_for_peakd = /https:\/\/files\.peakd\.com\/[^\s]+\.jpg/;
  const peakd_img = post.body.match(regex_for_peakd);
  const regex = /!\[.*?\]\((.*?)\)/;
  const match = post.body.match(regex);
  const regexgif = /<img\s+src="([^"]+)"/;
  const matchgif = post.body.match(regexgif);
  const other_images_from_body = extractUrlsFromJsonString(post.body);

  function find_first_img() {
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
      return post.json_metadata.links[0].slice(0, post.json_metadata.links[0].length - 1);
    }
    if (post.original_entry && post.original_entry.json_metadata.images) {
      return post.original_entry.json_metadata.images[0];
    }
    if (post.original_entry && post.original_entry.json_metadata.image) {
      return post.original_entry.json_metadata.image[0];
    }
    if (post.json_metadata.image && post.json_metadata.image[0]) {
      return post.json_metadata.image[0];
    }
    if (match && match[1]) {
      return match[1];
    }
    if (post.json_metadata.images && post.json_metadata.images[0]) {
      return post.json_metadata.images[0];
    }
    if (post.json_metadata.flow?.pictures && post.json_metadata.flow?.pictures[0]) {
      return post.json_metadata.flow?.pictures[0].url;
    }
    if (youtube_id[0]) {
      return `https://img.youtube.com/vi/${youtube_id[0]}/0.jpg`;
    }
    if (pictures_extracted[0]) {
      return pictures_extracted[0];
    }
    if (other_images_from_body[0]) {
      return other_images_from_body[0];
    }
    if (peakd_img !== null) {
      return peakd_img[0];
    }
    if (matchgif && matchgif[1]) {
      return matchgif[1];
    }

    if (!post.title.includes('RE: ') && post.depth === 0) {
      return `https://images.hive.blog/u/${post.author}/avatar/large`;
    }
    return '';
  }

  return (
    <>
      {find_first_img() ? (
        <Link
          href={`/${post.category}/@${post.author}/${post.permlink}`}
          data-testid="post-image"
          className={clsx({ hidden: post.stats?.gray })}
        >
          <div className="relative flex h-[210px] items-center overflow-hidden bg-transparent sm:h-[360px] md:mr-3.5 md:max-h-[80px] md:w-fit md:min-w-[130px] md:max-w-[130px]">
            <picture className="articles__feature-img h-ful w-full">
              <source
                srcSet={proxifyImageUrl(find_first_img(), '256x512').replace(/ /g, '%20')}
                media="(min-width: 1000px)"
              />
              <img srcSet={find_first_img()} alt="Post image" loading="lazy" className="w-full" />
            </picture>
          </div>
        </Link>
      ) : null}
    </>
  );
}
