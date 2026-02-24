import { Entry } from '@hive/common-hiveio-packages/wax';
import { find_first_img } from '../list-of-posts/post-img';
import { Link } from '@hive/ui';
import { proxifyImageSrc } from '@ui/lib/proxify-images';
import { useState } from 'react';
import { getDefaultImageUrl } from '@hive/ui';

const truncateTitle = (title: string, maxLength: number = 50) => {
  return title.length > maxLength ? `${title.substring(0, maxLength)}...` : title;
};

interface SuggestionsCardProps {
  entry: Entry;
  horizontal?: boolean;
}

const SuggestionsCard = ({ entry, horizontal }: SuggestionsCardProps) => {
  const cardImage = find_first_img(entry);
  const [image, setImage] = useState<string>(cardImage);

  if (horizontal) {
    return (
      <div className="w-44 flex-shrink-0 snap-start overflow-hidden rounded-lg bg-background shadow-md">
        <Link href={`/${entry.category}/@${entry.author}/${entry.permlink}`}>
          {image ? (
            <div className="h-24 overflow-hidden bg-transparent">
              <img
                src={proxifyImageSrc(image, 256, 512)}
                alt="Post image"
                loading="lazy"
                className="h-full w-full object-cover"
                onError={() => setImage(getDefaultImageUrl())}
              />
            </div>
          ) : (
            <div className="flex h-24 items-center justify-center bg-background-secondary text-xs text-muted-foreground">
              No image
            </div>
          )}
          <div className="p-2">
            <h2 className="line-clamp-2 text-xs font-semibold leading-tight">{entry.title}</h2>
            <p className="mt-1 truncate text-[11px] text-muted-foreground">@{entry.author}</p>
          </div>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-4 mb-3 flex flex-col overflow-hidden rounded-lg bg-background shadow-md">
      <Link href={`/${entry.category}/@${entry.author}/${entry.permlink}`} data-testid="post-image">
        {image ? (
          <div className="flex h-24 items-center overflow-hidden bg-transparent">
            <picture className="articles__feature-img h-full w-full">
              <source
                srcSet={proxifyImageSrc(image, 256, 512)}
                media="(min-width: 600px)"
                onError={() => setImage(getDefaultImageUrl())}
              />
              <img
                srcSet={image}
                alt="Post image"
                loading="lazy"
                className="h-full w-full object-cover"
                onError={() => setImage(getDefaultImageUrl())}
              />
            </picture>
          </div>
        ) : null}
        <h2 className="p-1.5 text-xs font-semibold">{truncateTitle(entry.title)}</h2>
      </Link>
      <div className="flex items-center gap-1.5 px-1.5 pb-1.5 text-xs text-muted-foreground">
        <Link href={`/${entry.category}/@${entry.author}/${entry.permlink}`}>@{entry.author}</Link>
        <span>·</span>
        <time>{new Date(entry.created).toLocaleDateString()}</time>
      </div>
    </div>
  );
};
export default SuggestionsCard;
