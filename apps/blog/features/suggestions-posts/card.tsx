import { Entry } from '@transaction/lib/extended-hive.chain';
import { find_first_img } from '../list-of-posts/post-img';
import Link from 'next/link';
import { proxifyImageUrl } from '@ui/lib/old-profixy';
import { useState } from 'react';
import { getDefaultImageUrl } from '@hive/ui';

const truncateTitle = (title: string, maxLength: number = 50) => {
  return title.length > maxLength ? `${title.substring(0, maxLength)}...` : title;
};

const SuggestionsCard = ({ entry }: { entry: Entry }) => {
  const cardImage = find_first_img(entry);
  const [image, setImage] = useState<string>(cardImage);
  return (
    <div className="m-4 flex flex-col rounded-lg bg-background shadow-md">
      <Link href={`/${entry.category}/@${entry.author}/${entry.permlink}`} data-testid="post-image">
        <>
          {image ? (
            <div className="flex h-24 items-center overflow-hidden rounded-t-lg bg-transparent">
              <picture className="articles__feature-img h-ful w-full">
                <source
                  srcSet={proxifyImageUrl(image, '256x512').replace(/ /g, '%20')}
                  media="(min-width: 600px)"
                  onError={() => setImage(getDefaultImageUrl())}
                />
                <img
                  srcSet={image}
                  alt="Post image"
                  loading="lazy"
                  className="w-full"
                  onError={() => setImage(getDefaultImageUrl())}
                />
              </picture>
            </div>
          ) : null}
        </>
        <h2 className="p-1 text-xs font-semibold">{truncateTitle(entry.title)}</h2>
      </Link>
      <div className="flex flex-col p-1 text-sm text-gray-500">
        <Link href={`/${entry.category}/@${entry.author}/${entry.permlink}`}>{entry.author}</Link>
        <time>{new Date(entry.created).toLocaleDateString()}</time>
      </div>
    </div>
  );
};
export default SuggestionsCard;
